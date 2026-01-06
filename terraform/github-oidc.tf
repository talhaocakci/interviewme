# Use existing GitHub OIDC Provider (or create if it doesn't exist)
# Check if the provider already exists
data "aws_iam_openid_connect_provider" "github_existing" {
  count = var.github_repository != "" ? 1 : 0
  url   = "https://token.actions.githubusercontent.com"
}

# Only create if it doesn't exist
# If you get an error that it already exists, Terraform will use the data source above
locals {
  github_oidc_provider_arn = var.github_repository != "" ? (
    length(data.aws_iam_openid_connect_provider.github_existing) > 0 
    ? data.aws_iam_openid_connect_provider.github_existing[0].arn 
    : ""
  ) : ""
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  count       = var.github_repository != "" ? 1 : 0
  name        = "${var.project_name}-github-actions-${var.environment}"
  description = "Role for GitHub Actions to deploy ${var.project_name}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.github_existing[0].arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-github-actions-role"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Policy for S3 deployment
resource "aws_iam_role_policy" "github_actions_s3" {
  count = var.github_repository != "" ? 1 : 0
  name  = "s3-deployment"
  role  = aws_iam_role.github_actions[0].id

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
          aws_s3_bucket.web_app.arn,
          "${aws_s3_bucket.web_app.arn}/*"
        ]
      }
    ]
  })
}

# Policy for CloudFront invalidation
resource "aws_iam_role_policy" "github_actions_cloudfront" {
  count = var.github_repository != "" ? 1 : 0
  name  = "cloudfront-invalidation"
  role  = aws_iam_role.github_actions[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = aws_cloudfront_distribution.web_app.arn
      }
    ]
  })
}

# Attach secrets manager read policy
resource "aws_iam_role_policy_attachment" "github_actions_secrets" {
  count      = var.github_repository != "" ? 1 : 0
  role       = aws_iam_role.github_actions[0].name
  policy_arn = aws_iam_policy.github_actions_secrets.arn
}

