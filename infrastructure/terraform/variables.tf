variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "Google Cloud region"
  type        = string
  default     = "us-central1"
}


variable "bucket_name" {
  description = "Nombre único del bucket para almacenar el código fuente"
  type        = string
}