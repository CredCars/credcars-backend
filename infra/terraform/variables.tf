variable "env" {
  description = "Deployment environment name (e.g., staging, production)"
  type        = string
  default     = "staging"
}

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Elastic Beanstalk application name"
  type        = string
  default     = "Credcars-backend"
}
