variable "env" {
  type = string
}

variable "etl_job_name" {
  description = "Glue ETL job name (raw_to_curated)."
  type        = string
}

variable "raw_erp_database" {
  description = "Glue Catalog database name for ERP raw."
  type        = string
}

variable "raw_epm_database" {
  type = string
}

variable "raw_crm_database" {
  type = string
}

variable "curated_crawler_name" {
  description = "Glue crawler over the curated zone (run after ETL)."
  type        = string
}

variable "schedule_enabled" {
  description = "Whether to enable the daily EventBridge schedule. Set to false to avoid surprise runs while iterating."
  type        = bool
  default     = false
}
