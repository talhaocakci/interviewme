# Lambda Functions for Serverless Backend

# Auth Lambda Function
resource "aws_lambda_function" "auth" {
  filename      = "../lambda/auth.zip"
  function_name = "${var.project_name}-auth-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "handler.handler"  # Main router handler
  runtime       = "python3.11"
  timeout       = 30
  memory_size   = 256

  environment {
    variables = {
      USERS_TABLE    = aws_dynamodb_table.main.name
      DYNAMODB_TABLE = aws_dynamodb_table.main.name
      JWT_SECRET_KEY = var.jwt_secret_key != "" ? var.jwt_secret_key : random_password.jwt_secret.result
    }
  }

  source_code_hash = fileexists("../lambda/auth.zip") ? filebase64sha256("../lambda/auth.zip") : ""

  tags = {
    Name        = "${var.project_name}-auth"
    Environment = var.environment
  }
}

# Chat Lambda Function
resource "aws_lambda_function" "chat" {
  filename      = "../lambda/chat.zip"
  function_name = "${var.project_name}-chat-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "handler.create_conversation"
  runtime       = "python3.11"
  timeout       = 30
  memory_size   = 256

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.main.name
      S3_BUCKET      = aws_s3_bucket.app_storage.id
    }
  }

  source_code_hash = fileexists("../lambda/chat.zip") ? filebase64sha256("../lambda/chat.zip") : ""

  tags = {
    Name        = "${var.project_name}-chat"
    Environment = var.environment
  }
}

# WebSocket Lambda Function
resource "aws_lambda_function" "websocket" {
  filename      = "../lambda/websocket.zip"
  function_name = "${var.project_name}-websocket-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "handler.connect"
  runtime       = "python3.11"
  timeout       = 300  # WebSocket needs longer timeout
  memory_size   = 512

  environment {
    variables = {
      DYNAMODB_TABLE    = aws_dynamodb_table.main.name
      WEBSOCKET_API_ID  = aws_apigatewayv2_api.websocket.id
      STAGE             = var.environment
    }
  }

  source_code_hash = fileexists("../lambda/websocket.zip") ? filebase64sha256("../lambda/websocket.zip") : ""

  tags = {
    Name        = "${var.project_name}-websocket"
    Environment = var.environment
  }
}

# Lambda Permissions for API Gateway
resource "aws_lambda_permission" "api_gateway_auth" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_chat" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chat.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_websocket" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.websocket.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

