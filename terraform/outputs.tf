output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.app_storage.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.app_storage.arn
}

output "s3_bucket_region" {
  description = "Region of the S3 bucket"
  value       = aws_s3_bucket.app_storage.region
}

output "iam_user_name" {
  description = "IAM user name"
  value       = aws_iam_user.app_user.name
}

output "iam_access_key_id" {
  description = "IAM access key ID"
  value       = aws_iam_access_key.app_user.id
  sensitive   = true
}

output "iam_secret_access_key" {
  description = "IAM secret access key"
  value       = aws_iam_access_key.app_user.secret
  sensitive   = true
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.main.name
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.main.arn
}

output "api_gateway_url" {
  description = "API Gateway REST API URL"
  value       = aws_apigatewayv2_stage.main.invoke_url
}

output "websocket_url" {
  description = "API Gateway WebSocket URL"
  value       = aws_apigatewayv2_stage.websocket.invoke_url
}

output "lambda_functions" {
  description = "Lambda function names"
  value = {
    auth                 = aws_lambda_function.auth.function_name
    chat                 = aws_lambda_function.chat.function_name
    room                 = aws_lambda_function.room.function_name
    websocket_connect    = aws_lambda_function.websocket_connect.function_name
    websocket_disconnect = aws_lambda_function.websocket_disconnect.function_name
    websocket_message    = aws_lambda_function.websocket_message.function_name
  }
}

output "jwt_secret" {
  description = "JWT Secret Key"
  value       = var.jwt_secret_key != "" ? "***provided***" : random_password.jwt_secret.result
  sensitive   = true
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.app.name
}

output "web_s3_bucket_name" {
  description = "S3 bucket name for web hosting"
  value       = aws_s3_bucket.web_app.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.web_app.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.web_app.domain_name
}

output "web_app_url" {
  description = "Web application URL"
  value       = "https://calls.contentpub.io"
}

output "cloudfront_url" {
  description = "CloudFront distribution URL (fallback)"
  value       = "https://${aws_cloudfront_distribution.web_app.domain_name}"
}

output "secrets_manager_secret_name" {
  description = "AWS Secrets Manager secret name"
  value       = aws_secretsmanager_secret.app_secrets.name
}

output "secrets_manager_secret_arn" {
  description = "AWS Secrets Manager secret ARN"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "github_actions_role_arn" {
  description = "IAM Role ARN for GitHub Actions (OIDC)"
  value       = var.github_repository != "" ? aws_iam_role.github_actions[0].arn : "Not configured - set github_repository variable"
}

output "github_oidc_provider_arn" {
  description = "GitHub OIDC Provider ARN"
  value       = var.github_repository != "" ? data.aws_iam_openid_connect_provider.github_existing[0].arn : "Not configured - set github_repository variable"
}

