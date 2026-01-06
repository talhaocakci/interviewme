"""
WebSocket handler for video call rooms with WebRTC signaling
"""
import json
import os
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

# API Gateway Management API client (initialized per request)
def get_apigw_client(event):
    """Get API Gateway Management API client"""
    domain_name = event['requestContext']['domainName']
    stage = event['requestContext']['stage']
    endpoint_url = f"https://{domain_name}/{stage}"
    return boto3.client('apigatewaymanagementapi', endpoint_url=endpoint_url)

def connect_handler(event, context):
    """Handle new WebSocket connection"""
    connection_id = event['requestContext']['connectionId']
    query_params = event.get('queryStringParameters') or {}
    room_id = query_params.get('room_id')
    
    print(f"🔗 New connection: {connection_id}, room: {room_id}")
    
    try:
        if room_id:
            # Check if room exists and has space
            room_result = table.get_item(
                Key={
                    'PK': f'ROOM#{room_id}',
                    'SK': 'METADATA'
                }
            )
            
            if 'Item' in room_result:
                room = room_result['Item']
                
                # Check if room is full
                if room.get('active_participants', 0) >= room.get('max_participants', 2):
                    print(f"❌ Room {room_id} is full")
                    return {
                        'statusCode': 403,
                        'body': 'Room is full'
                    }
                
                # Increment participant count
                table.update_item(
                    Key={
                        'PK': f'ROOM#{room_id}',
                        'SK': 'METADATA'
                    },
                    UpdateExpression='SET active_participants = if_not_exists(active_participants, :zero) + :inc',
                    ExpressionAttributeValues={
                        ':inc': 1,
                        ':zero': 0
                    }
                )
                print(f"✅ Incremented participant count for room {room_id}")
            
            # Store connection with room association
            table.put_item(
                Item={
                    'PK': f'CONNECTION#{connection_id}',
                    'SK': 'METADATA',
                    'connection_id': connection_id,
                    'room_id': room_id,
                    'connected_at': datetime.utcnow().isoformat(),
                    'ttl': int(datetime.utcnow().timestamp()) + 3600  # 1 hour
                }
            )
            print(f"✅ Stored connection record for {connection_id}")
        
        return {'statusCode': 200}
    
    except Exception as e:
        print(f"❌ Error in connect: {str(e)}")
        return {'statusCode': 500}

def disconnect_handler(event, context):
    """Handle WebSocket disconnection"""
    connection_id = event['requestContext']['connectionId']
    
    print(f"🔌 Disconnect: {connection_id}")
    
    try:
        # Get connection info
        result = table.get_item(
            Key={
                'PK': f'CONNECTION#{connection_id}',
                'SK': 'METADATA'
            }
        )
        
        if 'Item' in result:
            room_id = result['Item'].get('room_id')
            
            # Decrement room participant count
            if room_id:
                try:
                    # Use conditional update to prevent going below 0
                    update_response = table.update_item(
                        Key={
                            'PK': f'ROOM#{room_id}',
                            'SK': 'METADATA'
                        },
                        UpdateExpression='SET active_participants = if_not_exists(active_participants, :zero) - :dec',
                        ConditionExpression='active_participants > :zero',
                        ExpressionAttributeValues={
                            ':dec': 1,
                            ':zero': 0
                        },
                        ReturnValues='UPDATED_NEW'
                    )
                    print(f"✅ Decremented participant count for room {room_id}: {update_response.get('Attributes', {})}")
                    
                    # Notify other participants
                    notify_room(event, room_id, connection_id, {
                        'type': 'peer_left',
                        'connection_id': connection_id
                    })
                except Exception as e:
                    # If condition fails (count already 0), that's fine
                    if 'ConditionalCheckFailedException' in str(e):
                        print(f"⚠️ Room {room_id} count already at 0")
                    else:
                        print(f"❌ Error updating room: {str(e)}")
            
            # Delete connection
            table.delete_item(
                Key={
                    'PK': f'CONNECTION#{connection_id}',
                    'SK': 'METADATA'
                }
            )
            print(f"✅ Deleted connection record for {connection_id}")
        else:
            print(f"⚠️ No connection record found for {connection_id}")
        
        return {'statusCode': 200}
    
    except Exception as e:
        print(f"❌ Error in disconnect: {str(e)}")
        return {'statusCode': 500}

def message_handler(event, context):
    """Handle incoming WebSocket messages"""
    connection_id = event['requestContext']['connectionId']
    body = event.get('body', '{}')
    
    try:
        message = json.loads(body)
        msg_type = message.get('type')
        
        print(f"Message from {connection_id}: {msg_type}")
        
        # Get connection info
        result = table.get_item(
            Key={
                'PK': f'CONNECTION#{connection_id}',
                'SK': 'METADATA'
            }
        )
        
        if 'Item' not in result:
            return {'statusCode': 404}
        
        room_id = result['Item'].get('room_id')
        
        # Handle different message types
        if msg_type == 'ping':
            send_to_connection(event, connection_id, {'type': 'pong'})
        
        elif msg_type == 'join_room':
            # Notify others of new peer
            notify_room(event, room_id, connection_id, {
                'type': 'peer_joined',
                'connection_id': connection_id
            })
            
            # Send list of existing peers back to joiner
            peers = get_room_connections(room_id, exclude=connection_id)
            send_to_connection(event, connection_id, {
                'type': 'peers_list',
                'peers': peers
            })
        
        elif msg_type in ['offer', 'answer', 'ice-candidate']:
            # WebRTC signaling
            target_id = message.get('target')
            
            if target_id:
                # Send to specific peer
                send_to_connection(event, target_id, {
                    'type': msg_type,
                    'from': connection_id,
                    'data': message.get('data')
                })
            else:
                # Broadcast to all in room
                notify_room(event, room_id, connection_id, {
                    'type': msg_type,
                    'from': connection_id,
                    'data': message.get('data')
                })
        
        return {'statusCode': 200}
    
    except Exception as e:
        print(f"Error handling message: {str(e)}")
        return {'statusCode': 500}

def get_room_connections(room_id, exclude=None):
    """Get all connections in a room"""
    try:
        result = table.scan(
            FilterExpression='begins_with(PK, :pk) AND room_id = :room_id',
            ExpressionAttributeValues={
                ':pk': 'CONNECTION#',
                ':room_id': room_id
            }
        )
        
        connections = []
        for item in result.get('Items', []):
            conn_id = item['connection_id']
            if conn_id != exclude:
                connections.append(conn_id)
        
        return connections
    
    except Exception as e:
        print(f"Error getting room connections: {str(e)}")
        return []

def notify_room(event, room_id, exclude_connection, message):
    """Send message to all connections in a room except one"""
    try:
        connections = get_room_connections(room_id, exclude=exclude_connection)
        client = get_apigw_client(event)
        
        for conn_id in connections:
            try:
                client.post_to_connection(
                    ConnectionId=conn_id,
                    Data=json.dumps(message).encode('utf-8')
                )
            except client.exceptions.GoneException:
                # Connection is stale, delete it
                table.delete_item(
                    Key={
                        'PK': f'CONNECTION#{conn_id}',
                        'SK': 'METADATA'
                    }
                )
            except Exception as e:
                print(f"Error sending to {conn_id}: {str(e)}")
    
    except Exception as e:
        print(f"Error notifying room: {str(e)}")

def send_to_connection(event, connection_id, message):
    """Send message to a specific connection"""
    try:
        client = get_apigw_client(event)
        client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message).encode('utf-8')
        )
    except client.exceptions.GoneException:
        # Connection is stale, delete it
        table.delete_item(
            Key={
                'PK': f'CONNECTION#{connection_id}',
                'SK': 'METADATA'
            }
        )
    except Exception as e:
        print(f"Error sending to connection {connection_id}: {str(e)}")

