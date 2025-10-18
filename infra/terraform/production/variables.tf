variable "env" {
  description = "Deployment environment name (e.g., staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default = "us-east-1"
}

variable "app_name" {
  description = "Elastic Beanstalk application name"
  type        = string
  default = "Credcars-backend"
}

variable "instance_type" {
  description = "Elastic Beanstalk application name"
  type        = string
  default = "t3.micro"
}

variable "load_balancer_type" {
  description = "Elastic Beanstalk application name"
  type        = string
  default = "application"
}

variable "port" {
  description = "Elastic Beanstalk application name"
  type        = string
  default = "8080"
}

variable "app_zip_path" {
  description = "Path to the Beanstalk application zip file"
  type        = string
  default     = "app.zip"
}

variable "database_url" {
  description = "Your database's url"
  type        = string
  sensitive   = true

}

variable "jwt_secret" {
  description = "JWT SECRET"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT REFRESH SECRET"
  type        = string
  sensitive   = true
}

variable "jwt_expires_in" {
  description = "JWT EXPIRES IN"
  type        = string
}

variable "jwt_refresh_expires_in" {
  description = "JWT REFRESH EXPIRES IN"
  type        = string
}
