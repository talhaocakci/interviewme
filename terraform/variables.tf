variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "chatvideo"
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "cors_origins" {
  description = "Allowed CORS origins for S3"
  type        = list(string)
  default     = ["http://localhost:19006", "http://localhost:3000"]
}

variable "recording_retention_days" {
  description = "Number of days to keep recordings"
  type        = number
  default     = 90
}

# JWT Secret
variable "jwt_secret_key" {
  description = "JWT secret key (auto-generated if not provided)"
  type        = string
  default     = ""
  sensitive   = true
}

# CloudWatch
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# GitHub Repository for OIDC
variable "github_repository" {
  description = "GitHub repository in format: owner/repo (e.g., username/interviewme)"
  type        = string
  default     = ""
}

