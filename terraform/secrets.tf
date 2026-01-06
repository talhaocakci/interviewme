# AWS Secrets Manager for storing application secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.project_name}-app-secrets-${var.environment}"
  description = "Application secrets for ${var.project_name}"

  tags = {
    Name        = "${var.project_name}-app-secrets"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Store all application secrets in one JSON object
resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id

  secret_string = jsonencode({
    API_BASE_URL                = aws_apigatewayv2_stage.main.invoke_url
    WS_URL                      = aws_apigatewayv2_stage.websocket.invoke_url
    S3_BUCKET_NAME              = aws_s3_bucket.web_app.id
    CLOUDFRONT_DISTRIBUTION_ID  = aws_cloudfront_distribution.web_app.id
    AWS_REGION                  = var.aws_region
    JWT_SECRET                  = var.jwt_secret_key != "" ? var.jwt_secret_key : random_password.jwt_secret.result
  })
}

# IAM policy for GitHub Actions to access secrets
resource "aws_iam_policy" "github_actions_secrets" {
  name        = "${var.project_name}-github-actions-secrets-${var.environment}"
  description = "Allow GitHub Actions to read secrets from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.app_secrets.arn
      }
    ]
  })
}

# Attach secrets policy to the app user
resource "aws_iam_user_policy_attachment" "github_actions_secrets" {
  user       = aws_iam_user.app_user.name
  policy_arn = aws_iam_policy.github_actions_secrets.arn
}

