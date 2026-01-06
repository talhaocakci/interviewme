import json
import os
import boto3
from datetime import datetime
from decimal import Decimal
import uuid

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])


def response(status_code: int, body: dict):
    """Create API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': True,
        },
        'body': json.dumps(body, default=str)
    }


def create_conversation(event, context):
    """Create a new conversation"""
    try:
        body = json.loads(event['body'])
        participant_ids = body.get('participant_ids', [])
        is_group = body.get('is_group', False)
        name = body.get('name', '')
        
        # Get user ID from token (simplified)
        user_id = event['requestContext']['authorizer']['userId']
        
        conv_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Create conversation metadata
        table.put_item(Item={
            'PK': f'CONV#{conv_id}',
            'SK': 'METADATA',
            'conversationId': conv_id,
            'name': name,
            'isGroup': is_group,
            'createdAt': timestamp,
            'lastMessageAt': timestamp
        })
        
        # Add participants
        for participant_id in [user_id] + participant_ids:
            table.put_item(Item={
                'PK': f'CONV#{conv_id}',
                'SK': f'PARTICIPANT#{participant_id}',
                'userId': participant_id,
                'joinedAt': timestamp
            })
            
            # Add reverse lookup
            table.put_item(Item={
                'PK': f'USER#{participant_id}',
                'SK': f'CONV#{conv_id}',
                'conversationId': conv_id,
                'joinedAt': timestamp
            })
        
        return response(200, {
            'id': conv_id,
            'name': name,
            'is_group': is_group,
            'created_at': timestamp
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return response(500, {'error': str(e)})


def get_conversations(event, context):
    """Get user's conversations"""
    try:
        user_id = event['requestContext']['authorizer']['userId']
        
        # Query conversations for user
        result = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'USER#{user_id}',
                ':sk': 'CONV#'
            }
        )
        
        conversations = []
        for item in result.get('Items', []):
            conv_id = item['conversationId']
            
            # Get conversation metadata
            conv_data = table.get_item(
                Key={'PK': f'CONV#{conv_id}', 'SK': 'METADATA'}
            )
            
            if 'Item' in conv_data:
                conversations.append({
                    'id': conv_id,
                    'name': conv_data['Item'].get('name', ''),
                    'is_group': conv_data['Item'].get('isGroup', False),
                    'created_at': conv_data['Item'].get('createdAt', ''),
                    'last_message_at': conv_data['Item'].get('lastMessageAt', '')
                })
        
        return response(200, conversations)
        
    except Exception as e:
        print(f"Error: {e}")
        return response(500, {'error': str(e)})


def send_message(event, context):
    """Send a message"""
    try:
        conv_id = event['pathParameters']['conversationId']
        body = json.loads(event['body'])
        content = body.get('content', '')
        user_id = event['requestContext']['authorizer']['userId']
        
        message_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Save message
        table.put_item(Item={
            'PK': f'CONV#{conv_id}',
            'SK': f'MESSAGE#{timestamp}#{message_id}',
            'messageId': message_id,
            'conversationId': conv_id,
            'senderId': user_id,
            'content': content,
            'messageType': body.get('message_type', 'text'),
            'createdAt': timestamp
        })
        
        # Update conversation last message time
        table.update_item(
            Key={'PK': f'CONV#{conv_id}', 'SK': 'METADATA'},
            UpdateExpression='SET lastMessageAt = :timestamp',
            ExpressionAttributeValues={':timestamp': timestamp}
        )
        
        return response(200, {
            'id': message_id,
            'conversation_id': conv_id,
            'sender_id': user_id,
            'content': content,
            'created_at': timestamp
        })
        
    except Exception as e:
        print(f"Error: {e}")
        return response(500, {'error': str(e)})


def get_messages(event, context):
    """Get messages from conversation"""
    try:
        conv_id = event['pathParameters']['conversationId']
        limit = int(event.get('queryStringParameters', {}).get('limit', '50'))
        
        # Query messages
        result = table.query(
            KeyConditionExpression='PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues={
                ':pk': f'CONV#{conv_id}',
                ':sk': 'MESSAGE#'
            },
            ScanIndexForward=False,  # Latest first
            Limit=limit
        )
        
        messages = []
        for item in result.get('Items', []):
            messages.append({
                'id': item['messageId'],
                'conversation_id': item['conversationId'],
                'sender_id': item['senderId'],
                'content': item.get('content', ''),
                'message_type': item.get('messageType', 'text'),
                'created_at': item['createdAt']
            })
        
        messages.reverse()  # Return chronological order
        
        return response(200, messages)
        
    except Exception as e:
        print(f"Error: {e}")
        return response(500, {'error': str(e)})

