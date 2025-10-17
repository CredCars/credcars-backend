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
  default = "classic"
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
  default     = "mongodb+srv://codedcoder:g9cFLqxFpIy7FEiG@cluster0.nkje12q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
}