terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Dedicated Thriving Harmony account only. Do not point this at Intry or the
# claude-audit-user account (533350584402).
provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "thriving-harmony"
}

# Apply after the dedicated account exists and the AWS BAA is accepted in Artifact.
# This skeleton is the contract; resources are added when the account ID is known.
output "reminder" {
  value = "Create a new AWS account, accept the BAA, then add VPC, RDS, ECS, S3+KMS, Cognito here."
}
