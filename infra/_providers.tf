provider "aws" {
  region  = var.aws_region
  profile = var.aws_account != "" ? var.aws_account : null
}
