import json
import os
import boto3
from datetime import datetime
import secrets
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

# Helper to convert Decimal to int/float for JSON serialization
def decimal_to_number(obj):
    if isinstance(obj, list):
        return [decimal_to_number(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: decimal_to_number(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    else:
        return obj

def handler(event, context):
    """
    Handle room operations: create, join, get, list, leave
    """
    try:
        path = event.get('rawPath', event.get('path', ''))
        method = event.get('requestContext', {}).get('http', {}).get('method', 
                          event.get('httpMethod', 'GET'))
        
        print(f"Room handler - Path: {path}, Method: {method}")
        
        if path.endswith('/create') and method == 'POST':
            return create_room(event)
        elif path.endswith('/join') and method == 'POST':
            return join_room(event)
        elif path.endswith('/leave') and method == 'POST':
            return leave_room(event)
        elif '/room/' in path and method == 'GET':
            room_id = path.split('/room/')[-1]
            return get_room(room_id)
        elif path.endswith('/rooms') and method == 'GET':
            return list_rooms(event)
        else:
            return response(404, {'error': 'Not found'})
            
    except Exception as e:
        print(f"Error in room handler: {str(e)}")
        return response(500, {'error': str(e)})

def create_room(event):
    """Create a new video call room"""
    try:
        body = json.loads(event.get('body', '{}'))
        
        # Generate unique room ID
        room_id = secrets.token_urlsafe(8)
        
        # Get user from auth (if available)
        user_id = None
        claims = event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {})
        if claims:
            user_id = claims.get('sub')
        
        room_name = body.get('name', 'Video Call')
        max_participants = body.get('max_participants', 2)
        
        timestamp = datetime.utcnow().isoformat()
        
        item = {
            'PK': f'ROOM#{room_id}',
            'SK': 'METADATA',
            'room_id': room_id,
            'name': room_name,
            'created_by': user_id,
            'created_at': timestamp,
            'max_participants': max_participants,
            'active_participants': 0,
            'status': 'active',
            'ttl': int(datetime.utcnow().timestamp()) + 86400  # 24 hours
        }
        
        table.put_item(Item=item)
        
        return response(201, {
            'room_id': room_id,
            'name': room_name,
            'join_url': f'/room/{room_id}',
            'created_at': timestamp
        })
        
    except Exception as e:
        print(f"Error creating room: {str(e)}")
        return response(500, {'error': str(e)})

def join_room(event):
    """Join an existing room"""
    try:
        body = json.loads(event.get('body', '{}'))
        room_id = body.get('room_id')
        
        if not room_id:
            return response(400, {'error': 'room_id is required'})
        
        # Get room
        result = table.get_item(
            Key={
                'PK': f'ROOM#{room_id}',
                'SK': 'METADATA'
            }
        )
        
        if 'Item' not in result:
            return response(404, {'error': 'Room not found'})
        
        room = result['Item']
        
        # Check if room is full
        if room['active_participants'] >= room['max_participants']:
            return response(403, {'error': 'Room is full'})
        
        # Check if room is active
        if room.get('status') != 'active':
            return response(403, {'error': 'Room is not active'})
        
        # Increment participant count
        table.update_item(
            Key={
                'PK': f'ROOM#{room_id}',
                'SK': 'METADATA'
            },
            UpdateExpression='SET active_participants = active_participants + :inc',
            ExpressionAttributeValues={':inc': 1}
        )
        
        join_data = {
            'room_id': room_id,
            'name': room['name'],
            'participants': int(room['active_participants']) + 1,
            'max_participants': int(room['max_participants'])
        }
        
        return response(200, decimal_to_number(join_data))
        
    except Exception as e:
        print(f"Error joining room: {str(e)}")
        return response(500, {'error': str(e)})

def leave_room(event):
    """Leave a room"""
    try:
        body = json.loads(event.get('body', '{}'))
        room_id = body.get('room_id')
        
        if not room_id:
            return response(400, {'error': 'room_id is required'})
        
        # Get room
        result = table.get_item(
            Key={
                'PK': f'ROOM#{room_id}',
                'SK': 'METADATA'
            }
        )
        
        if 'Item' not in result:
            return response(404, {'error': 'Room not found'})
        
        # Decrement participant count (ensure it doesn't go below 0)
        table.update_item(
            Key={
                'PK': f'ROOM#{room_id}',
                'SK': 'METADATA'
            },
            UpdateExpression='SET active_participants = if_not_exists(active_participants, :zero) - :dec',
            ConditionExpression='active_participants > :zero',
            ExpressionAttributeValues={
                ':dec': 1,
                ':zero': 0
            }
        )
        
        print(f"Decremented participant count for room {room_id}")
        
        return response(200, {'message': 'Left room successfully', 'room_id': room_id})
        
    except Exception as e:
        # If the condition fails (count is already 0), still return success
        if 'ConditionalCheckFailedException' in str(e):
            print(f"Room {room_id} already has 0 participants")
            return response(200, {'message': 'Left room successfully', 'room_id': room_id})
        
        print(f"Error leaving room: {str(e)}")
        return response(500, {'error': str(e)})

def get_room(room_id):
    """Get room details"""
    try:
        result = table.get_item(
            Key={
                'PK': f'ROOM#{room_id}',
                'SK': 'METADATA'
            }
        )
        
        if 'Item' not in result:
            return response(404, {'error': 'Room not found'})
        
        room = result['Item']
        
        room_data = {
            'room_id': room['room_id'],
            'name': room['name'],
            'active_participants': room['active_participants'],
            'max_participants': room['max_participants'],
            'status': room['status'],
            'created_at': room['created_at']
        }
        
        return response(200, decimal_to_number(room_data))
        
    except Exception as e:
        print(f"Error getting room: {str(e)}")
        return response(500, {'error': str(e)})

def list_rooms(event):
    """List active rooms"""
    try:
        # Query active rooms (simplified - in production, use GSI)
        result = table.scan(
            FilterExpression='begins_with(PK, :pk) AND #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':pk': 'ROOM#',
                ':status': 'active'
            },
            Limit=50
        )
        
        rooms = []
        for item in result.get('Items', []):
            if item.get('SK') == 'METADATA':
                rooms.append({
                    'room_id': item['room_id'],
                    'name': item['name'],
                    'active_participants': item['active_participants'],
                    'max_participants': item['max_participants'],
                    'created_at': item['created_at']
                })
        
        return response(200, decimal_to_number({'rooms': rooms}))
        
    except Exception as e:
        print(f"Error listing rooms: {str(e)}")
        return response(500, {'error': str(e)})

def response(status_code, body):
    """Helper to create HTTP response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*'
        },
        'body': json.dumps(body)
    }

