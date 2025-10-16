variable "env" {
  description = "Deployment environment name (e.g., staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
}

variable "app_name" {
  description = "Elastic Beanstalk application name"
  type        = string
}
