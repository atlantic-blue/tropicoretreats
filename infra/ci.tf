# GitHub Actions OIDC provider and IAM roles for CI/CD
#
# The OIDC provider is a global AWS resource — only created in production
# workspace to avoid conflicts. Both workspaces create their own IAM role.

data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  count           = var.environment == "production" ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}

data "aws_caller_identity" "current" {}

locals {
  github_oidc_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "github_actions_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:atlantic-blue/tropicoretreats:*"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "tropico-github-actions-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume.json
}

# S3 access for deploying static sites
resource "aws_iam_role_policy" "github_actions_s3" {
  name = "s3-deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.admin.arn,
          "${aws_s3_bucket.admin.arn}/*",
          aws_s3_bucket.www.arn,
          "${aws_s3_bucket.www.arn}/*"
        ]
      }
    ]
  })
}

# CloudFront invalidation
resource "aws_iam_role_policy" "github_actions_cloudfront" {
  name = "cloudfront-invalidate"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["cloudfront:CreateInvalidation"]
        Resource = [
          aws_cloudfront_distribution.admin.arn,
          aws_cloudfront_distribution.www.arn
        ]
      }
    ]
  })
}

# Terraform state access (S3 backend)
resource "aws_iam_role_policy" "github_actions_terraform_state" {
  name = "terraform-state"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::abs-terraform",
          "arn:aws:s3:::abs-terraform/*"
        ]
      }
    ]
  })
}

# Terraform plan/apply permissions
resource "aws_iam_role_policy" "github_actions_terraform_manage" {
  name = "terraform-manage"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TerraformReadOnly"
        Effect = "Allow"
        Action = [
          "apigateway:GET",
          "acm:Describe*",
          "acm:List*",
          "acm:Get*",
          "cloudfront:Get*",
          "cloudfront:List*",
          "cognito-idp:Describe*",
          "cognito-idp:List*",
          "cognito-idp:Get*",
          "dynamodb:Describe*",
          "dynamodb:List*",
          "ec2:Describe*",
          "iam:Get*",
          "iam:List*",
          "lambda:Get*",
          "lambda:List*",
          "logs:Describe*",
          "logs:List*",
          "route53:Get*",
          "route53:List*",
          "s3:Get*",
          "s3:List*",
          "ses:Describe*",
          "ses:Get*",
          "ses:List*",
          "sns:Get*",
          "sns:List*",
          "sqs:Get*",
          "sqs:List*",
          "secretsmanager:Describe*",
          "secretsmanager:List*"
        ]
        Resource = "*"
      },
      {
        Sid    = "TerraformRegionalWrite"
        Effect = "Allow"
        Action = [
          "apigateway:*",
          "cognito-idp:*",
          "dynamodb:*",
          "lambda:*",
          "logs:*",
          "ses:*",
          "sns:*",
          "sqs:*",
          "secretsmanager:*"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = var.aws_region
          }
        }
      },
      {
        Sid    = "TerraformGlobalServices"
        Effect = "Allow"
        Action = [
          "iam:*",
          "route53:*",
          "cloudfront:*",
          "acm:*",
          "s3:*"
        ]
        Resource = "*"
      }
    ]
  })
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions"
  value       = aws_iam_role.github_actions.arn
}
