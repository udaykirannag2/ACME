# Phase 4F — Step Functions state machine + EventBridge daily schedule.
#
# State machine: runs the Glue ETL job 3 times in parallel (one per source
# database) using the .sync integration, which makes Step Functions wait for
# completion. Then runs the curated crawler so any new tables show up in the
# Glue Catalog.
#
# Cost: ~$0.025 per execution (Standard workflow, ~10 state transitions).
# EventBridge rule fires daily at 06:00 UTC.

terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.70" }
  }
}

# =============================================================================
# IAM role for Step Functions
# =============================================================================

data "aws_iam_policy_document" "sfn_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["states.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "sfn" {
  name               = "acme-finance-${var.env}-sfn-refresh"
  assume_role_policy = data.aws_iam_policy_document.sfn_assume.json
}

data "aws_iam_policy_document" "sfn_glue_access" {
  statement {
    effect = "Allow"
    actions = [
      "glue:StartJobRun", "glue:GetJobRun", "glue:GetJobRuns", "glue:BatchStopJobRun",
      "glue:StartCrawler", "glue:GetCrawler", "glue:GetCrawlerMetrics",
    ]
    resources = ["*"]
  }
  # .sync integration uses event bridge rules behind the scenes
  statement {
    effect = "Allow"
    actions = [
      "events:PutTargets", "events:PutRule", "events:DescribeRule",
    ]
    resources = ["*"]
  }
  # CloudWatch Logs for state machine logging
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogDelivery", "logs:DescribeLogGroups", "logs:DescribeResourcePolicies",
      "logs:GetLogDelivery", "logs:ListLogDeliveries", "logs:PutResourcePolicy",
      "logs:UpdateLogDelivery", "logs:DeleteLogDelivery",
      "logs:CreateLogStream", "logs:PutLogEvents",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "sfn_glue_access" {
  name   = "acme-finance-${var.env}-sfn-glue-access"
  policy = data.aws_iam_policy_document.sfn_glue_access.json
}

resource "aws_iam_role_policy_attachment" "sfn_glue_access" {
  role       = aws_iam_role.sfn.name
  policy_arn = aws_iam_policy.sfn_glue_access.arn
}

# =============================================================================
# State machine
# =============================================================================

locals {
  state_machine_definition = jsonencode({
    Comment = "Daily refresh: parallel ETL raw -> curated, then crawl curated"
    StartAt = "ParallelETL"
    States = {
      ParallelETL = {
        Type = "Parallel"
        Next = "RunCuratedCrawler"
        Branches = [
          {
            StartAt = "ETL_ERP"
            States = {
              ETL_ERP = {
                Type     = "Task"
                Resource = "arn:aws:states:::glue:startJobRun.sync"
                Parameters = {
                  JobName = var.etl_job_name
                  Arguments = {
                    "--source_database" = var.raw_erp_database
                  }
                }
                End = true
              }
            }
          },
          {
            StartAt = "ETL_EPM"
            States = {
              ETL_EPM = {
                Type     = "Task"
                Resource = "arn:aws:states:::glue:startJobRun.sync"
                Parameters = {
                  JobName = var.etl_job_name
                  Arguments = {
                    "--source_database" = var.raw_epm_database
                  }
                }
                End = true
              }
            }
          },
          {
            StartAt = "ETL_CRM"
            States = {
              ETL_CRM = {
                Type     = "Task"
                Resource = "arn:aws:states:::glue:startJobRun.sync"
                Parameters = {
                  JobName = var.etl_job_name
                  Arguments = {
                    "--source_database" = var.raw_crm_database
                  }
                }
                End = true
              }
            }
          },
        ]
      }
      RunCuratedCrawler = {
        Type     = "Task"
        Resource = "arn:aws:states:::aws-sdk:glue:startCrawler"
        Parameters = {
          Name = var.curated_crawler_name
        }
        # Crawler doesn't have .sync — fire-and-forget. The next invocation
        # of the state machine will see the latest catalog state regardless.
        End = true
        # Tolerate "CrawlerRunningException" if previous crawler is still going
        Catch = [{
          ErrorEquals = ["Glue.CrawlerRunningException"]
          Next        = "Done"
        }]
      }
      Done = {
        Type = "Succeed"
      }
    }
  })
}

resource "aws_cloudwatch_log_group" "sfn" {
  name              = "/aws/vendedlogs/states/acme-finance-${var.env}-refresh"
  retention_in_days = 14
}

resource "aws_sfn_state_machine" "refresh" {
  name     = "acme-finance-${var.env}-refresh"
  role_arn = aws_iam_role.sfn.arn
  type     = "STANDARD"
  definition = local.state_machine_definition

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.sfn.arn}:*"
    include_execution_data = true
    level                  = "ERROR"
  }

  tags = { Name = "acme-finance-${var.env}-refresh" }
}

# =============================================================================
# EventBridge daily schedule
# =============================================================================

data "aws_iam_policy_document" "eventbridge_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eventbridge_invoke_sfn" {
  name               = "acme-finance-${var.env}-eventbridge-sfn"
  assume_role_policy = data.aws_iam_policy_document.eventbridge_assume.json
}

data "aws_iam_policy_document" "eventbridge_invoke_sfn" {
  statement {
    effect    = "Allow"
    actions   = ["states:StartExecution"]
    resources = [aws_sfn_state_machine.refresh.arn]
  }
}

resource "aws_iam_policy" "eventbridge_invoke_sfn" {
  name   = "acme-finance-${var.env}-eventbridge-invoke-sfn"
  policy = data.aws_iam_policy_document.eventbridge_invoke_sfn.json
}

resource "aws_iam_role_policy_attachment" "eventbridge_invoke_sfn" {
  role       = aws_iam_role.eventbridge_invoke_sfn.name
  policy_arn = aws_iam_policy.eventbridge_invoke_sfn.arn
}

resource "aws_cloudwatch_event_rule" "daily" {
  name                = "acme-finance-${var.env}-daily-refresh"
  description         = "Daily 06:00 UTC trigger for the warehouse refresh state machine"
  schedule_expression = "cron(0 6 * * ? *)" # 06:00 UTC daily
  state               = var.schedule_enabled ? "ENABLED" : "DISABLED"
}

resource "aws_cloudwatch_event_target" "daily" {
  rule      = aws_cloudwatch_event_rule.daily.name
  target_id = "RefreshStateMachine"
  arn       = aws_sfn_state_machine.refresh.arn
  role_arn  = aws_iam_role.eventbridge_invoke_sfn.arn
}
