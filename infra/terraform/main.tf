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
    key    = "backend/${var.env}/terraform.tfstate"
    region = var.aws_region
  }
}

provider "aws" {
  region = var.aws_region
}
