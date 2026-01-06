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

# Recordings Lambda Function
resource "aws_lambda_function" "recordings" {
  filename      = "../lambda/recordings.zip"
  function_name = "${var.project_name}-recordings-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "handler.handler"
  runtime       = "python3.11"
  timeout       = 30
  memory_size   = 512

  environment {
    variables = {
      DYNAMODB_TABLE   = aws_dynamodb_table.main.name
      S3_BUCKET_NAME   = aws_s3_bucket.app_storage.bucket
      JWT_SECRET_KEY   = var.jwt_secret_key != "" ? var.jwt_secret_key : random_password.jwt_secret.result
    }
  }

  source_code_hash = fileexists("../lambda/recordings.zip") ? filebase64sha256("../lambda/recordings.zip") : ""

  tags = {
    Name        = "${var.project_name}-recordings"
    Environment = var.environment
  }
}

# Room Lambda Function
resource "aws_lambda_function" "room" {
  filename      = "../lambda/room.zip"
  function_name = "${var.project_name}-room-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "handler.handler"
  runtime       = "python3.11"
  timeout       = 30
  memory_size   = 256

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.main.name
    }
  }

  source_code_hash = fileexists("../lambda/room.zip") ? filebase64sha256("../lambda/room.zip") : ""

  tags = {
    Name        = "${var.project_name}-room"
    Environment = var.environment
  }
}

# WebSocket Lambda Function
resource "aws_lambda_function" "websocket_connect" {
  filename      = "../lambda/websocket.zip"
  function_name = "${var.project_name}-websocket-connect-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "room_handler.connect_handler"
  runtime       = "python3.11"
  timeout       = 300
  memory_size   = 512

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.main.name
    }
  }

  source_code_hash = fileexists("../lambda/websocket.zip") ? filebase64sha256("../lambda/websocket.zip") : ""

  tags = {
    Name        = "${var.project_name}-websocket-connect"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "websocket_disconnect" {
  filename      = "../lambda/websocket.zip"
  function_name = "${var.project_name}-websocket-disconnect-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "room_handler.disconnect_handler"
  runtime       = "python3.11"
  timeout       = 300
  memory_size   = 512

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.main.name
    }
  }

  source_code_hash = fileexists("../lambda/websocket.zip") ? filebase64sha256("../lambda/websocket.zip") : ""

  tags = {
    Name        = "${var.project_name}-websocket-disconnect"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "websocket_message" {
  filename      = "../lambda/websocket.zip"
  function_name = "${var.project_name}-websocket-message-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "room_handler.message_handler"
  runtime       = "python3.11"
  timeout       = 300
  memory_size   = 512

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.main.name
    }
  }

  source_code_hash = fileexists("../lambda/websocket.zip") ? filebase64sha256("../lambda/websocket.zip") : ""

  tags = {
    Name        = "${var.project_name}-websocket-message"
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

resource "aws_lambda_permission" "api_gateway_room" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.room.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_recordings" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.recordings.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_websocket_connect" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.websocket_connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_websocket_disconnect" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.websocket_disconnect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_websocket_message" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.websocket_message.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
}

