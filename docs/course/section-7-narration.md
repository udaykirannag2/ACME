# Section 7 — Hands-On Build: Narration Script

**Section duration:** ~150 min | **130 wpm** | **Cues:** [CLICK] [POINT] [PAUSE 2s]

---

## Module 7.0 — Setup

---

**[SLIDE 1] Section 7 — Hands-On Build**

Welcome to Section 7 — the largest, most hands-on section in this entire course. Everything we have discussed about agents, memory, tools, and architecture up to this point has been building toward this moment. We are going to deploy a fully working finance AI system, from raw data all the way through to a board-ready PDF, using real AWS services.

[POINT] Look at the module list on the left. We have eleven modules. We will move through them in order, and every module ends with a verification step. I cannot stress this enough — do not move to the next module until your verification passes. The modules build on each other. A broken data layer means broken tools means a broken agent.

[CLICK] On the right you can see modules 7.6 through 7.10 — the API, the dashboard, the end-to-end test, the board deliverables, and the final validation against real use cases.

[PAUSE 2s]

This section runs approximately one hundred and fifty minutes if you follow along at a comfortable pace. You will be switching between your terminal, the AWS Console, and a browser throughout. Keep all three open.

One more thing before we start: Claude Code will be your pair-programmer for much of this section. We will talk about how to use it effectively on slide four. For now — let us get the environment ready.

---

**[SLIDE 2] Prerequisites Checklist**

Before we touch a single line of infrastructure code, we need to confirm your environment is set up correctly. [POINT] Here is the full checklist.

AWS CLI version two — run `aws --version` and confirm you see a two-dot-something version. If you see version one, stop and upgrade. The Bedrock APIs we use require v2.

Terraform at version one-point-five or higher. The provider constraint in our `versions.tf` will reject anything older.

Python three-point-eleven-plus for the Lambda functions, the FastAPI server, and the Streamlit dashboard. All three use match statements and the walrus operator which require 3.10 at minimum — we standardise on 3.11.

[CLICK] Node.js 18 or higher for the build scripts you've been running to generate these slides.

Claude Code — install it with `npm install -g @anthropic-ai/claude-code`. We will use it heavily throughout this section.

dbt Core at 1.7-plus. And your AWS profile `acme-admin` — run `aws sso login --profile acme-admin` before anything else.

[PAUSE 2s]

If you are on the lab AMI, all of these are pre-installed. Run `setup-check.sh` in the repo root to validate all versions in one command before you continue.

---

**[SLIDE 3] Getting the Environment Running**

[POINT] The first three commands get you the code and authenticated. Clone the repo, change into the directory, then run `aws sso login --profile acme-admin`. This opens a browser window for the SSO flow. Complete it.

[CLICK] Now change into the infrastructure directory. Run `terraform init` to download providers and initialise the backend. Then run `terraform plan -out=tfplan` — read through the plan. You should see approximately thirty-five to forty resources being created. If you see errors at plan time, it is almost always a missing IAM permission on the `acme-admin` profile.

[CLICK] Once the plan looks good — `terraform apply tfplan`. This takes approximately twelve minutes. Do not interrupt it.

[POINT] On the right I have listed what Terraform creates: the Redshift Serverless workgroup, the Bedrock Agent and its IAM role, the three Lambda functions, the AgentCore Gateway, and the S3 and KMS resources.

[PAUSE 2s]

One important note about the cold start warning at the bottom. Redshift Serverless allocates compute on first use. The very first query — and that includes the first `dbt run` — will take up to sixty seconds. This is completely expected. It is not a failure.

---

**[SLIDE 4] Using AI to Build AI — Claude Code Workflow**

[POINT] Before we dive into the modules, I want to spend two minutes on how to use Claude Code effectively during this build. There are five steps, and they form a loop.

Step one: Describe. You tell Claude what you need in plain English. Not pseudocode, not specifications — just a clear description of the outcome you want.

[CLICK] Step two: Generate. Claude writes the code. Lambda handlers, SQL queries, Terraform resources, FastAPI endpoints — it does the first draft.

[CLICK] Step three: Review. This is the most important step, and it is non-negotiable. Read the code. Understand it. You are the architect. If Claude generated something you do not understand, ask it to explain. Never commit code you cannot explain.

[CLICK] Step four: Run. Execute it. If it errors, paste the error back into Claude. It reads errors and self-corrects. Most errors resolve in one or two iterations.

[CLICK] Step five: Commit. The output is yours. Git tracks every change. You are accountable for everything in the repository.

[POINT] The quote at the bottom is genuine — Claude Code wrote approximately sixty percent of the Lambda functions and SQL in this section. Every single line was reviewed before it went into git.

---

## Module 7.1 — Deploy the Data Layer

---

**[SLIDE 5] Module 7.1 Divider**

Module 7.1 — Deploy the Data Layer.

dbt and Redshift are the foundation of this entire system. Every Lambda tool, every API endpoint, every dashboard chart reads from the five mart tables we are about to create. Get this right before moving on.

---

**[SLIDE 6] Running dbt: Transforming Raw Finance Data**

[POINT] Two commands to run dbt. First, `dbt deps` installs any packages declared in `packages.yml`. This takes ten to fifteen seconds. Then `dbt run` executes all eighteen models in dependency order.

[PAUSE 2s]

The first time you run this, expect up to sixty seconds of silence before any output appears. That is the Redshift Serverless cold start. The compute is being allocated. Do not press control-C.

[CLICK] When it completes, you should see: `Completed successfully. Done. PASS=18 WARN=0 ERROR=0 SKIP=0 TOTAL=18`. If any model shows ERROR, look at the dbt logs — the most common cause is a permission issue on the Redshift workgroup.

[POINT] On the right you can see the five mart tables that get created. Each one feeds a specific part of the system. `mart_pl` feeds both the variance analysis and the what-if simulation. `mart_arr` feeds the ARR waterfall chart. `mart_ar_aging` feeds the AR aging table. `mart_revenue` feeds the revenue trend. And `mart_forecast` holds the pre-computed four-quarter projections that the forecast Lambda reads from.

These are the tables everything downstream depends on.

---

**[SLIDE 7] Verify: Tests Pass, Marts Populated**

[POINT] After `dbt run`, immediately run `dbt test`. This executes all the schema tests — not-null constraints, uniqueness checks, referential integrity. You should see forty-two passing tests, zero warnings, zero errors.

[CLICK] Then do a quick spot-check directly in the Redshift Query Editor. Open the AWS Console, navigate to Redshift, open the Query Editor v2, and run the two queries you see here. `mart_pl` should return at least one thousand rows. `mart_revenue` should return around six hundred and twenty-four.

[PAUSE 2s]

[POINT] The four KPI cards confirm what you are looking for: eighteen models, forty-two tests, `mart_pl` populated, `mart_revenue` populated.

[CLICK] When you see that green banner at the bottom — "Foundation complete. All 5 mart tables populated" — that is your signal to move to Module 7.2. Not before.

This step is your data contract. Every number that comes out of the agent, every chart in the dashboard, every figure in the board pack — they all trace back to these mart tables and these forty-two tests passing.

---

## Module 7.2 — Deploy Bedrock Agent

---

**[SLIDE 8] Terraform Creates the Bedrock Agent**

[POINT] Module 7.2 is a Terraform-first module. We use `aws_bedrockagent_agent` — this resource is fully supported in the hashicorp/aws provider version 5. The agent name is `acme-finance-agent`, the foundation model is `anthropic.claude-sonnet-4-5`, and the instruction is loaded from a separate file — `system_prompt.txt`.

[CLICK] The system prompt is where the magic lives. It teaches Claude four things: the ACME fiscal calendar, which runs October through September — not the calendar year. The entity hierarchy — US, EMEA, APAC, and Consolidated. Which tool to call for each type of question. And how to format answers in a way that a CFO can use directly — with specific numbers, specific periods, and no hedging.

[CLICK] We also create an alias called `live`. Aliases let you swap the underlying agent version without changing the ARN your API uses. This is critical for production deployments where you need zero-downtime agent updates.

[PAUSE 2s]

To deploy just this module without re-applying everything: `terraform apply -target=module.bedrock_agent`. This completes in about two minutes and outputs the Agent ID — which should be LUUHZWRDA4.

---

**[SLIDE 9] Verify: Agent PREPARED**

[POINT] The verification command is `aws bedrock-agent list-agents --profile acme-admin` with a query filter to find your specific agent. The output you are looking for has three fields.

Agent ID: LUUHZWRDA4. Agent status: PREPARED — not CREATING, not FAILED — PREPARED. And the foundation model matches exactly: `anthropic.claude-sonnet-4-5`.

[CLICK] The table below walks through each check and what to do if something looks wrong. If the status shows CREATING after five minutes, check CloudWatch for the Bedrock service. If it shows FAILED, the most common cause is the IAM role not having the `bedrock:CreateAgent` permission.

[PAUSE 2s]

The IAM role check at the bottom of the table is worth doing manually. Navigate to the IAM console, find the `bedrock-agent-*` role, and confirm the policy allows both `bedrock:InvokeAgent` and `lambda:InvokeFunction`. Missing the Lambda permission means the agent can authenticate but cannot call your tools.

Once you see PREPARED — you have an agent. On to Module 7.3.

---

## Module 7.3 — Wire AgentCore Gateway

---

**[SLIDE 10] Module 7.3 Divider**

Module 7.3 — Wire AgentCore Gateway.

The agent knows how to reason. The Gateway is what connects that reasoning to your actual data. Without the Gateway, the agent has no tools. With it, it has five.

---

**[SLIDE 11] Real-World Pattern: Provider Hasn't Caught Up Yet**

[POINT] This slide addresses a real-world problem you will encounter on every engagement that uses new AWS services: the Terraform provider has not caught up yet.

`aws_bedrockagentcore_*` resources are not available in the hashicorp/aws provider version 5.x. This is not a bug. It is the normal lifecycle of AWS services. New capabilities ship to the AWS API months before the Terraform provider supports them as first-class resources.

[CLICK] The production pattern is to pin the ARNs as Terraform locals. Look at the code — we define `gateway_id` and `gateway_arn` as local values. The five tool targets are also declared as locals pointing to the Lambda ARNs that Terraform does know about.

[PAUSE 2s]

[POINT] On the right, in the amber warning card, is why this matters for your client engagements. First: this is safe and auditable. Locals are documented in code. Second: you provision the AgentCore resources using the AWS CLI or SDK directly — they exist in AWS, they just are not managed by Terraform state. Third: as soon as the provider reaches version 6 and adds the resource blocks, you can `terraform import` and take over management cleanly.

"Version drift" between what AWS offers and what the Terraform provider supports is a real engagement risk. Document it. Put it in the architecture decision log. Your client's future team needs to know why those locals exist.

---

**[SLIDE 12] Verify: All 5 Gateway Targets Active**

[POINT] The verification command uses the AWS CLI directly — `aws bedrockagentcore list-gateway-targets` — passing the full Gateway ID: `acme-finance-dev-finance-tools-rrlhpdtveg`.

[CLICK] You should see exactly five targets, all in ACTIVE status: text_to_sql, forecast, variance_rca, whatif_sim, and describe_metric. Each maps to a specific Lambda function.

[PAUSE 2s]

If any target shows as PENDING or FAILED, re-run the `register-gateway-targets.sh` script in the infrastructure module. That script uses the AWS CLI to register each Lambda ARN with the Gateway. Check that the Lambda ARNs in your `locals.targets` block match the actual Lambda ARNs in your account.

[POINT] The green banner at the bottom captures the key insight: the Gateway is the router. When the agent decides to call `variance_rca`, it sends a structured JSON payload to the Gateway. The Gateway looks up the target, finds the Lambda ARN, and invokes it. The agent never needs to know Lambda exists — it just calls a named tool.

All five targets active. Module 7.3 complete.

---

## Module 7.4 — Wire AgentCore Memory

---

**[SLIDE 13] Module 7.4 Divider**

Module 7.4 — Wire AgentCore Memory.

This is what separates a stateful finance assistant from a simple Q-and-A chatbot. Memory lets the agent remember what each analyst cares about — across sessions, across days, across conversations.

---

**[SLIDE 14] Two IDs: sessionId vs memoryId**

[POINT] There are two distinct IDs in every call to the agent, and they serve completely different purposes.

On the left: `sessionId`. This is ephemeral. It scopes to one browser tab or one API session. When the session ends — either because the user closes the tab or the TTL expires — the sessionId is gone. If you do not supply a sessionId, we generate a fresh UUID for every request. This is fine for stateless lookups, but it means the agent cannot maintain conversation context within a session.

[CLICK] On the right: `memoryId`. This is persistent. It is scoped to an analyst — a person. The format we use is `analyst-{user_id}`. This ID survives browser closes, multi-day gaps, everything. The Memory service uses a SEMANTIC strategy — it vectorises each Q-and-A pair and stores them for retrieval.

[PAUSE 2s]

Before every agent invocation, we retrieve the top five most semantically relevant memory records for that analyst. Those records get injected into the prompt as context. After the agent responds, we store the new Q-and-A pair back into memory.

[POINT] The rule is simple: always pass `memoryId=analyst-{user_id}` in your `/chat` calls. If you skip it, the agent works — but it has no memory of previous conversations. The analyst has to re-orient it every single time. That is a terrible experience.

Memory TTL is thirty days, configurable in the AgentCore console.

---

**[SLIDE 15] Code Pattern & Cross-Session Verification**

[POINT] The code pattern has two halves. Before invoke: call `retrieve_memory` with the analyst's memoryId, ask for the top five records using the SEMANTIC strategy, join the content into a string, and include that string in the system message.

[CLICK] After invoke: call `create_memory_record` with the memoryId, and store the question, answer, entity, and timestamp. The entity field is critical — it lets the semantic search find entity-relevant memories even when the question wording differs.

[PAUSE 2s]

The verification test on the right is the one that always impresses people in demos. Open the dashboard in Session 1. Ask: "Focus on EMEA. What was revenue?" The agent responds with EMEA revenue. Now close the browser. Open a fresh session. Use the same `memoryId`. Ask: "Compare to the prior year." Without any prompting, without any context-setting — the agent responds in the context of EMEA.

[POINT] That is memory working correctly. It is not magic — it is the five retrieved memory records being injected into the prompt. But from the analyst's perspective, it feels like the assistant knows them.

When your cross-session test passes — Module 7.4 is done.

---

## Module 7.5 — Lambda Analysis Tools

---

**[SLIDE 16] Module 7.5 Divider**

Module 7.5 — Lambda Analysis Tools.

Three tools. One shared pattern. All three take typed input, query Redshift via the Data API, and return structured JSON. Let us build them.

---

**[SLIDE 17] The Pattern: All Three Tools Follow This**

[POINT] Every Lambda tool in this system follows the same five-line pattern. Step one: parse the typed input from the event. The AgentCore Gateway validates the input schema before it reaches your Lambda — you will never see a missing field or a wrong type. Step two: build parameterised SQL. Never interpolate user input into SQL strings directly — always use parameter binding.

[CLICK] Step three: execute via the Redshift Data API. This is the key architectural decision. We are not running the Lambda inside a VPC. We are not using a JDBC driver. We call `execute_statement` with the workgroup name, database, and SQL. It returns a statement ID immediately — execution is asynchronous.

Step four: poll until the statement completes. This typically takes one to two seconds on a warm workgroup. Step five: fetch results with `get_statement_result` and return structured JSON.

[PAUSE 2s]

[POINT] The table at the bottom summarises the contract for each tool. `variance_rca` returns a sorted list of drivers. `whatif_sim` returns the new margin in basis points and the operating income delta. `forecast` returns projections by quarter. These are the shapes the agent expects. If you change the output structure, update the action group schema in Bedrock or the agent will not know how to parse the response.

---

**[SLIDE 18] variance_rca: Root-Cause the Budget Gap**

[POINT] Here is the core SQL for the variance RCA tool. It joins `fct_gl_entries` — the actual general ledger postings — to `stg_epm__plan_line` — the plan numbers from the EPM system — on line item and period. It calculates the variance as actual minus plan, groups by line item and cost centre, and orders by the absolute value of variance descending.

[CLICK] The parameterised inputs are entity and fiscal year. The `top_n` parameter lets the agent ask for five drivers, or ten, depending on what the analyst needs.

[PAUSE 2s]

[POINT] The verification: run the tool with entity equals EMEA, fiscal year equals 2024. The top three results should match the table at the bottom of this slide. Number one: R&D Personnel in Engineering EMEA, with a variance of negative four-point-two million dollars. Number two: Cloud Infra in Platform EMEA. Number three: Sales Comp in Commercial EMEA.

[CLICK] The green banner at the bottom is important: this is the expected answer for all end-to-end tests in Module 7.8. When you ask the agent "what was the top EMEA cost overrun in 2024," it should invoke this tool and return R&D Personnel in Engineering EMEA. If it returns something different, the mart data is wrong or the Lambda is querying the wrong schema.

---

**[SLIDE 19] whatif_sim: Model a Cost Change — R&D −15%**

[POINT] The what-if simulation tool is the one that generates the most excitement in FP&A demos. You hand it a line item and a percentage change. It re-rolls the entire P&L using the mart_pl table and tells you the new operating margin and the operating income delta.

[CLICK] Look at the code. Payload: line item equals R&D, percent change equals negative zero-point-fifteen. The Lambda re-rolls the P&L and returns six fields. Base revenue: one billion eight hundred and seven-point-nine million dollars. Base operating income: ninety-nine-point-four million — which is a five-point-five percent margin. New operating income: one hundred and sixty-two-point-three million. Delta: plus sixty-two-point-nine million. New margin in basis points: eight hundred and ninety-eight. Margin delta: three hundred and forty-eight basis points.

[PAUSE 2s]

[POINT] These are the key numbers for your E2E tests. R&D minus fifteen percent arrow plus three forty-eight basis points, plus sixty-two-point-nine million operating income. Say them out loud. They should match exactly.

[CLICK] The three test scenarios in the table confirm the tool works correctly across different directions — a cost reduction improving margin, a revenue increase improving margin, and a cost increase hurting margin. Run all three. The what-if tool is the most analytically complex Lambda and the most likely place for off-by-one errors in the P&L re-roll logic.

---

**[SLIDE 20] forecast: 4-Quarter Forward Projections**

[POINT] The forecast tool is the simplest of the three — not because the forecasting is easy, but because we have moved the computation into dbt. The Lambda just reads from `mart_forecast`. There is no live calculation at query time.

[CLICK] The payload asks for a specific entity and a number of quarters ahead — one through four. The response is a list of projections: quarter label, revenue in millions, and year-over-year growth percentage.

[PAUSE 2s]

For the US entity, four quarters ahead: Q1 FY25 at four seventy-eight-point-two million, Q2 at four ninety-two-point-seven, Q3 at five-oh-one-point-three, and Q4 at five nineteen-point-eight.

[POINT] On the right, the method note explains why mart_forecast is pre-computed. dbt runs a four-quarter rolling average with a seasonal index applied. This runs as part of your standard `dbt run`. The Lambda does not recalculate — it just reads what dbt produced. This keeps Lambda cold-start times low and makes the forecast deterministic: the same dbt run always produces the same projections.

When all three Lambda tools verify correctly, Module 7.5 is complete. This is the largest module in the section — well done.

---

## Module 7.6 — Build FastAPI Layer

---

**[SLIDE 21] Module 7.6 Divider**

Module 7.6 — Build the FastAPI Layer.

The API is the connective tissue. It is what the Streamlit dashboard calls. It is what external systems can call. It is what the Bedrock Agent uses for the commentary and board-pack endpoints. Eight endpoints, one application, port eight thousand.

---

**[SLIDE 22] 8 Endpoints — One API for All Consumers**

[POINT] Let us walk through the eight endpoints. `/chat` is the main conversational endpoint. It accepts a question and a memoryId, invokes the Bedrock Agent, and returns an answer with citations. This is the heart of the AI Analyst tab.

[CLICK] `/commentary` generates a four-paragraph CFO narrative by calling Claude directly with the P&L actuals as grounding data. `/boardpack` generates the full PDF. These two are both POST endpoints because they require entity and period parameters.

[CLICK] The four `/metrics/*` endpoints are simple GET requests that query the mart tables directly. P&L, ARR, AR aging, revenue time series — each reads from the corresponding mart and returns rows as JSON. The dashboard uses these for the chart tabs.

[PAUSE 2s]

And `/health` — always build a health endpoint. It is what the ALB uses to decide whether to route traffic to this instance. It is what your monitoring scripts will ping. It should respond in under ten milliseconds.

[POINT] For the lab, we skip authentication. In production, all endpoints except `/health` should require a Cognito JWT in the Authorization header. We cover this in Module 7.10 when we talk about productionisation.

---

**[SLIDE 23] Start & Verify the API**

[POINT] Start the API with uvicorn. The `--reload` flag enables hot-reload during development — when you change a file, uvicorn restarts automatically. Remove that flag in production.

[CLICK] The first verification is the health check. `curl localhost:8000/health` should return `{"status":"ok"}` in under a hundred milliseconds. If it returns a 500, check your Python environment — the most common cause is a missing package import.

[PAUSE 2s]

[CLICK] The metrics test confirms the API can reach Redshift. `GET /metrics/pl?entity=US&fiscal_year=2024` should return a rows array with at least one item. If it returns an empty array, your dbt run did not complete correctly. If it returns a 500, check the `REDSHIFT_WORKGROUP` environment variable.

[CLICK] The chat test is the most important. A POST to `/chat` with the question "Total revenue FY2024?" should return an answer of one billion eight hundred and seven-point-nine million, with source `mart_revenue`. If the answer is wrong, your agent has the wrong data. If the call times out, check the Lambda cold start — it might be the Redshift sixty-second startup.

[POINT] The warning at the bottom: if `/chat` returns a 500, check two things — the `BEDROCK_AGENT_ID` environment variable must be LUUHZWRDA4, and the Lambda execution role must have `bedrock:InvokeAgent` in its policy.

---

## Module 7.7 — Build Streamlit Dashboard

---

**[SLIDE 24] Module 7.7 Divider**

Module 7.7 — Build the Streamlit Dashboard.

This is the interface that FP&A will actually open every morning. Six tabs. All data live from your mart tables. And the AI Analyst tab — where natural language questions become structured answers.

---

**[SLIDE 25] Six Tabs — One Dashboard**

[POINT] Let us walk through all six tabs.

The P&L tab shows a grouped bar chart — revenue, gross profit, and operating income by quarter. There is a sidebar where the analyst selects entity and fiscal year. This calls `/metrics/pl` and renders with Plotly.

[CLICK] ARR — a waterfall chart showing new ARR, expansion, churn, contraction, and ending ARR. The analyst can toggle between entities. This is the chart the board always asks for in SaaS companies.

AR Aging — a bucket table showing what is current, what is thirty days past due, sixty days, and ninety-plus. Colour-coded: green for current, amber for thirty, red for sixty and beyond. You can filter by customer segment.

[CLICK] AI Analyst — the conversational tab. The analyst types a question, the dashboard calls `/chat`, and the answer appears with a citation showing which mart table it came from. The `memoryId` is stored in Streamlit's session state, so it persists for the browser session.

Commentary — calls `/commentary` with the selected entity and period and displays the four-paragraph narrative. There is a copy-to-clipboard button so the analyst can paste it directly into their board template.

[CLICK] And Board Pack — the one-click PDF. Press the Download button and Streamlit calls `/boardpack`, waits approximately eight seconds, and offers the PDF for download.

All charts use Plotly for interactivity — hover tooltips, zoom, export to PNG. The theme uses custom CSS to match the ACME brand palette.

---

**[SLIDE 26] Start & Verify the Dashboard**

[POINT] Open a second terminal. Terminal one is running the API on port eight thousand. Terminal two starts Streamlit: `streamlit run ui/app.py --server.port 8501`.

Open your browser to `localhost:8501`. All six tabs should appear within three seconds.

[CLICK] The smoke test for the AI Analyst tab: type "What was ACME total revenue in 2024?" The expected answer is one billion eight hundred and seven-point-nine million dollars. Source: mart_revenue from the acme-finance-dev workgroup.

[PAUSE 2s]

[POINT] The KPI cards confirm what you are looking for: the correct revenue answer, response time under four seconds on a warm Redshift cluster, all six tabs loading, and the memory active for the test analyst ID.

[CLICK] The verification table at the bottom gives you a tab-by-tab checklist. For P&L: select entity US, fiscal year 2024, and confirm a bar chart renders. For ARR: toggle to EMEA and confirm the waterfall updates. For the AI Analyst: the revenue question. For Board Pack: click Download and confirm the PDF opens.

[POINT] If the P&L tab is empty — your dbt run did not complete. If AI Analyst shows an error — your API is not running on port 8000. These are the two most common issues at this stage. Check them in that order.

---

## Module 7.8 — End-to-End Test

---

**[SLIDE 27] Module 7.8 Divider**

Module 7.8 — End-to-End Test.

Six queries. Six expected answers. You need all six to pass before you declare this system done. Let us run through them.

---

**[SLIDE 28] Six Queries — Six Expected Answers**

[POINT] Query one: "ACME total revenue FY2024?" Tool invoked: text_to_sql reading from mart_revenue. Expected answer: one billion eight hundred and seven-point-nine million dollars. This is the simplest test and the one you should run first.

[CLICK] Query two: "Operating margin last three years?" The agent should read three years of P&L data and return: FY22 plus eight-point-nine percent, FY23 plus five-point-five percent, FY24 negative nine-point-four percent. Three years, three numbers, in order.

Query three: "Top variance driver in EMEA for FY2024?" Tool: variance_rca. Expected: R&D Personnel in Engineering EMEA.

[CLICK] Query four: "What if R&D is cut by fifteen percent?" Tool: whatif_sim. Expected: plus three forty-eight basis points of margin, plus sixty-two-point-nine million of operating income.

Query five: "Revenue forecast next four quarters?" Tool: forecast. Expected: four seventy-eight, four ninety-three, five oh one, five twenty — all in millions.

[PAUSE 2s]

[CLICK] Query six is different. Open a new browser session — or clear your session cookies. Use the same `memoryId` you used in the previous session. Ask: "What was my last focus area?" Without being told, the agent should say "EMEA" — because it retrieved that from persistent memory.

When all six pass, you have a working end-to-end finance AI system. The data layer, the intelligence layer, and the presentation layer are all operating correctly and communicating properly.

---

**[SLIDE 29] Troubleshooting: Systematic Debug Path**

[POINT] If any of your six E2E queries fail, work through this checklist from top to bottom. Do not skip steps. Each check rules out a layer of the stack.

Start with the API health check. `curl localhost:8000/health`. If this fails, nothing else will work. Restart uvicorn and confirm port 8000 is not in use by another process.

[CLICK] If the API is healthy but queries return wrong data — run `dbt test`. If any tests fail, your mart data is incorrect. Re-run `dbt run` and check for model errors.

If dbt is clean but the agent returns wrong answers — check the agent status. If it is not PREPARED, re-apply the bedrock_agent module.

[CLICK] If the agent is PREPARED but tool calls fail — list the Gateway targets. If any of the five targets are not ACTIVE, re-register them using the CLI script.

[PAUSE 2s]

[POINT] Lambda logs are your friend. `aws logs tail` with the function name prefix will show you every invocation in real time. Look for import errors — these happen when a dependency is not in the Lambda layer. Look for permission errors — these happen when the execution role is missing a policy.

[CLICK] The red warning at the bottom: the most common failure is Redshift cold start. If you see a five-oh-four error from Lambda, do not panic. Wait sixty seconds and retry. The workgroup is resuming. It will not fail permanently.

---

## Module 7.9 — Commentary and Board Pack

---

**[SLIDE 30] Module 7.9 Divider**

Module 7.9 — Commentary and Board Pack.

The two board-ready deliverables. The commentary turns mart data into CFO language. The board pack bundles everything into a single PDF. Let us build and verify both.

---

**[SLIDE 31] /commentary — CFO Narrative in 4 Paragraphs**

[POINT] The commentary endpoint takes three fields: entity, period, and fiscal year. It reads the P&L actuals from mart_pl, passes them to Claude as structured context, and asks Claude to write a four-paragraph CFO narrative. The whole request takes approximately six seconds.

[CLICK] The four paragraphs are structured consistently: executive summary first — the headline numbers and the biggest call-out. Revenue drivers second — what drove growth or decline, broken down by geography, product mix, and foreign exchange. Cost drivers third — headcount movements, R&D spend, operating expenses versus plan. And outlook fourth — risks and opportunities for the next quarter.

[PAUSE 2s]

[POINT] The sample text in the purple card on the left shows what the opening of the EMEA September 2024 commentary looks like. "EMEA reported revenue of four hundred and twelve-point-three million for September 2024, achieving ninety-four percent of plan." It cites the R&D Personnel variance of negative four-point-two million and attributes it to Engineering EMEA headcount additions.

This is grounded language. Claude is not inventing numbers. It is reading mart_pl and expressing what it finds.

[CLICK] The verification test: POST with entity EMEA, period September 2024. Read the four paragraphs carefully. Every number mentioned in the narrative should match a row in mart_pl. If you see a number that does not match — that is a prompt engineering issue. Check that the system prompt correctly instructs Claude to only cite numbers present in the provided data.

---

**[SLIDE 32] /boardpack — One-Click Board PDF**

[POINT] The board pack endpoint takes the same three inputs as commentary. It calls four data sources — the three mart tables and the commentary endpoint — assembles all the content, and generates a PDF using the reportlab library. The output is approximately three hundred and fifty kilobytes and takes around eight seconds.

[CLICK] The PDF has eight pages. Three pages of P&L actuals versus plan, one page for the ARR waterfall, one for AR aging, one for the CFO commentary, and two for the cover page and appendix.

[PAUSE 2s]

In the Streamlit dashboard, the Board Pack tab has a single Download button. When the analyst clicks it, Streamlit calls `POST /boardpack`, waits for the response, and offers the PDF as a file download. The analyst goes from "I need the board pack" to PDF-in-hand in under ten seconds. No manual formatting. No copy-paste from spreadsheets.

[POINT] The verification: download the EMEA September 2024 board pack. Open it. Check three things: the revenue number on page one matches what you saw in the P&L tab, the commentary on the last text page matches the `/commentary` output, and the document opens without errors in your PDF reader.

If the PDF is blank or corrupted, check the reportlab installation in your FastAPI environment. It sometimes needs `pip install reportlab==4.0.4` specifically — newer versions have breaking API changes.

---

## Module 7.10 — Use Cases and Testing

---

**[SLIDE 33] Module 7.10 Divider**

Module 7.10 — Use Cases and Testing.

We are almost done. This final module validates the system against real FP&A use cases and prepares you to adapt this architecture for your own client engagements.

---

**[SLIDE 34] Six Use Cases — Run All Before Done**

[POINT] Six use cases, each with an expected output and a pass or fail checkbox. Work through all six systematically.

UC-1: Revenue lookup. "FY2024 total revenue?" Expected: one billion eight hundred and seven-point-nine million.

UC-2: Margin trend. "Operating margin last three years?" Expected: FY22 plus eight-point-nine, FY23 plus five-point-five, FY24 minus nine-point-four.

[CLICK] UC-3: Variance root-cause. "Top EMEA cost overrun?" Expected: R&D Personnel in Engineering EMEA, negative four-point-two million.

UC-4: What-if simulation. "R&D cut fifteen percent?" Expected: plus three forty-eight basis points, plus sixty-two-point-nine million income.

[PAUSE 2s]

UC-5: Commentary generation. POST to `/commentary` with EMEA and September 2024. Expected: four paragraphs with no numbers that contradict mart_pl.

[CLICK] UC-6: Memory recall. New browser session, same memoryId. Ask a follow-up question about the entity you discussed in the previous session. Expected: agent recalls context without being re-told.

[POINT] The amber warning at the bottom: if UC-3 or UC-4 fail, your first stop is Lambda CloudWatch logs. If UC-6 fails, the issue is almost always the memoryId — check that your application code is passing the same memoryId string across sessions. A single character difference creates a new memory namespace.

---

**[SLIDE 35] Adapt This Architecture for Your Engagement**

[POINT] This is the slide for the architects in the room. When you leave this lab and start thinking about your next client engagement, here is the mental model.

The left column — swap the data layer. Replace the ACME dbt models with your client's dbt project. Point the Redshift workgroup at their data. Update the mart table names in the Lambda SQL. Your dbt tests become the data quality SLA.

[CLICK] The middle column — update the system prompt. This is where you embed client-specific knowledge: their fiscal calendar, their entity names, their definition of ARR or gross margin. Different clients define these things differently. The system prompt is where you capture that context so the agent speaks the client's language.

[CLICK] The right column — the architecture stays fixed. The Bedrock Agent ID changes. The Lambda targets update. But the FastAPI application, the Streamlit code, the Terraform module structure — all of it is reused.

[PAUSE 2s]

[POINT] The estimate at the bottom: three to five days to re-platform for a new client with an existing dbt project. If the client does not have dbt, add a sprint to build the mart layer first.

The architecture is your repeatable asset. The system prompt and the mart tables are the customisation surface. Keep that separation clear and your delivery velocity will be consistent across engagements.

---

## Section Recap

---

**[SLIDE 36] Section 7 Complete — What You Built**

[POINT] Let us look at the complete system in one view.

At the bottom: the data layer. Redshift Serverless with the `acme-finance-dev` workgroup. dbt with eighteen models producing five mart tables in the `analytics_dev_marts` schema. This is your ground truth.

[CLICK] In the middle: the intelligence layer. Bedrock Agent LUUHZWRDA4 running Claude Sonnet. AgentCore Gateway with five active targets. AgentCore Memory with the SEMANTIC strategy and thirty-day persistence. Three Lambda tools — variance RCA, what-if simulation, and forecast — all reading from the mart tables via the Redshift Data API.

[CLICK] At the top: the presentation layer. FastAPI with eight endpoints on port eight thousand. Streamlit with six tabs on port eight-five-oh-one. And two deliverables — the `/boardpack` PDF and the `/commentary` narrative — available as API calls and as dashboard buttons.

[PAUSE 2s]

Data flows upward. Analyst questions flow downward. The agent sits in the middle, routing questions to tools and synthesising answers into language a CFO can use directly.

This is a production-pattern system. Not a demo. Not a prototype. A system you can deploy, maintain, and adapt for real engagements.

---

**[SLIDE 37] Key Numbers — All Verified**

[POINT] These eight KPI cards are the numbers you should have seen when running your E2E tests. Let me read through them.

FY2024 consolidated revenue: one billion eight hundred and seven-point-nine million. Operating margin trend: plus eight-point-nine percent in FY22, plus five-point-five in FY23, minus nine-point-four in FY24. EMEA top driver: R&D Personnel in Engineering EMEA with a negative four-point-two million dollar variance. R&D minus fifteen percent simulation: plus three forty-eight basis points and plus sixty-two-point-nine million of operating income.

[CLICK] Memory recall: verified. dbt tests: forty-two passing. Gateway targets: five active. Board pack: PDF generated correctly for EMEA September 2024.

[PAUSE 2s]

[POINT] These numbers are deterministic. They come from the ACME seed data that gets loaded during `dbt seed`. If you see different numbers — revenue that is slightly off, a different top driver — run `dbt seed && dbt run` from scratch. Seed data occasionally gets partially loaded if a previous run was interrupted.

I will say this again because it matters: these same numbers appear in the narration script, the E2E test checklist, and the sample board pack. If a number differs anywhere in your system, trace it back to the mart table first.

---

**[SLIDE 38] Claude Code — Hours Saved During the Build**

[POINT] Before we close, let us quantify what Claude Code contributed to this section.

The Lambda SQL for three tools — I estimate six hours manually, one-and-a-half with Claude Code. The Terraform modules — four hours manually, one with Claude Code. The FastAPI endpoints — five hours manually, one-and-a-half with Claude Code.

[CLICK] The dbt models were the biggest saving: eight hours of manual work, two hours with Claude Code. Streamlit: six hours manually, two with Claude Code. Tests: four hours manually, one with Claude Code.

Total: thirty-three hours manually estimated, nine hours with Claude Code. Approximately twenty-four hours saved.

[PAUSE 2s]

[POINT] I want to be precise about what Claude Code actually did. It wrote first drafts. It diagnosed error messages. It suggested the Redshift Data API pattern when I described the no-VPC constraint. It wrote the reportlab PDF generation code from a description of the sections.

What I did: I reviewed every line. I made architectural decisions. I decided which patterns to use and which to reject. I designed the tool contracts. Claude accelerated the execution. I owned the architecture.

That division of labour is the model we are teaching in this course.

---

**[SLIDE 39] Common Post-Lab Questions**

[POINT] In every cohort that runs this lab, the same five questions come up. Let me answer them now.

How do I add a new Lambda tool? Three steps: add the new target to the `agentcore/locals.targets` block in Terraform. Write the Lambda following the shared pattern from slide seventeen. Update the Bedrock Agent action group to declare the new tool's input and output schema.

[CLICK] How do I change the system prompt? Edit the file at `infrastructure/modules/bedrock_agent/system_prompt.txt`. Run `terraform apply -target=module.bedrock_agent`. The agent re-prepares in approximately two minutes. No Lambda changes needed.

How do I add a new entity? Add the entity to the Redshift seed data and re-run `dbt seed && dbt run`. The entity becomes queryable immediately. The agent does not need to be told — it will discover the new entity through the text_to_sql tool.

[CLICK] Can I use a different LLM? Yes. Change the `foundation_model` in Terraform. Claude Sonnet is our recommendation for finance use cases because it follows the structured output instructions most reliably and handles multi-step reasoning well. Haiku is faster and cheaper but less reliable for complex variance analysis.

[PAUSE 2s]

[POINT] How do I productionise this? Add Cognito auth to FastAPI. Move Streamlit to an ECS Fargate service. Add CloudWatch alarms for Lambda errors, API latency, and Redshift compute capacity. Enable Redshift usage limits to control cost. And add WAF in front of the ALB.

Section 8 covers all of this in detail.

---

**[SLIDE 40] Section 7 Recap + Next Section**

Congratulations. Section 7 is complete.

[POINT] Look at what you built. Eighteen dbt models producing a clean, tested data foundation. Three Lambda tools that answer the questions FP&A asks every month. Five Gateway targets connecting the agent's reasoning to real data. Eight API endpoints that make everything accessible. Six Streamlit tabs that FP&A will actually open. And two board-ready deliverables — the commentary and the board pack — that go from SQL query to PDF in under ten seconds.

[PAUSE 2s]

[CLICK] You deployed a production-pattern finance AI system. Not a prototype. Not a proof of concept. A system with a real data layer, real tests, real observability, and a repeatable architecture you can adapt for client engagements starting Monday.

[POINT] The teaser at the bottom: Section 8 — Execution. We go from the lab to production. How do you present this to a CFO? How do you build the roadmap? How do you govern AI outputs in a finance context? How do you prove ROI to the organisation that funded this project?

Everything you built today is the foundation for those conversations. See you in Section 8.

---

*End of Section 7 Narration Script*
*Total words: ~7,400 | ~57 min read-through at 130 wpm | Full-length narration with lab steps: ~150 min*
