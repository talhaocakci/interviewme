import json
import os
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

# AWS_REGION is automatically provided by Lambda runtime
aws_region = os.environ.get('AWS_REGION', os.environ.get('AWS_DEFAULT_REGION', 'us-east-1'))

apigateway = boto3.client('apigatewaymanagementapi',
    endpoint_url=f"https://{os.environ['WEBSOCKET_API_ID']}.execute-api.{aws_region}.amazonaws.com/{os.environ['STAGE']}")


def response(status_code: int, body: dict = {}):
    """Create WebSocket response"""
    return {
        'statusCode': status_code,
        'body': json.dumps(body)
    }


def connect(event, context):
    """Handle WebSocket connection"""
    try:
        connection_id = event['requestContext']['connectionId']
        # Store connection (userId from query params or auth)
        user_id = event.get('queryStringParameters', {}).get('userId', 'anonymous')
        
        table.put_item(Item={
            'PK': f'CONNECTION#{connection_id}',
            'SK': 'METADATA',
            'connectionId': connection_id,
            'userId': user_id,
            'connectedAt': datetime.utcnow().isoformat()
        })
        
        # Add reverse lookup
        table.put_item(Item={
            'PK': f'USER#{user_id}',
            'SK': f'CONNECTION#{connection_id}',
            'connectionId': connection_id,
            'connectedAt': datetime.utcnow().isoformat()
        })
        
        return response(200)
        
    except Exception as e:
        print(f"Error: {e}")
        return response(500)


def disconnect(event, context):
    """Handle WebSocket disconnection"""
    try:
        connection_id = event['requestContext']['connectionId']
        
        # Get connection info
        result = table.get_item(
            Key={'PK': f'CONNECTION#{connection_id}', 'SK': 'METADATA'}
        )
        
        if 'Item' in result:
            user_id = result['Item']['userId']
            
            # Remove connection
            table.delete_item(
                Key={'PK': f'CONNECTION#{connection_id}', 'SK': 'METADATA'}
            )
            
            # Remove reverse lookup
            table.delete_item(
                Key={'PK': f'USER#{user_id}', 'SK': f'CONNECTION#{connection_id}'}
            )
        
        return response(200)
        
    except Exception as e:
        print(f"Error: {e}")
        return response(500)


def send_message(event, context):
    """Handle WebSocket message"""
    try:
        connection_id = event['requestContext']['connectionId']
        body = json.loads(event['body'])
        action = body.get('action')
        
        if action == 'sendMessage':
            conversation_id = body.get('conversationId')
            message = body.get('message')
            
            # Get all connections in conversation
            result = table.query(
                KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
                ExpressionAttributeValues={
                    ':pk': f'CONV#{conversation_id}',
                    ':sk': 'PARTICIPANT#'
                }
            )
            
            # Send to all participants
            for participant in result.get('Items', []):
                user_id = participant['userId']
                
                # Get user's connections
                user_conns = table.query(
                    KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
                    ExpressionAttributeValues={
                        ':pk': f'USER#{user_id}',
                        ':sk': 'CONNECTION#'
                    }
                )
                
                # Send to each connection
                for conn in user_conns.get('Items', []):
                    try:
                        apigateway.post_to_connection(
                            ConnectionId=conn['connectionId'],
                            Data=json.dumps({
                                'type': 'message',
                                'conversationId': conversation_id,
                                'message': message
                            })
                        )
                    except:
                        # Connection no longer exists, clean up
                        table.delete_item(
                            Key={'PK': f'USER#{user_id}', 'SK': f"CONNECTION#{conn['connectionId']}"}
                        )
        
        return response(200)
        
    except Exception as e:
        print(f"Error: {e}")
        return response(500)


def default(event, context):
    """Handle default messages"""
    return response(200)

