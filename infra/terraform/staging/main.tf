terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "credcars-terraform-state"
    key    = "backend/staging/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_elastic_beanstalk_environment" "staging" {
  name        = "${var.app_name}-staging-env"
  application = aws_elastic_beanstalk_application.app.name
  solution_stack_name = "64bit Amazon Linux 2023 v6.6.6 running Node.js 20"
  # ... staging-specific settings like instance type, env vars
}
