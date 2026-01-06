"""
Lambda handler for recording management and S3 upload URLs
"""
import json
import os
import boto3
from datetime import datetime, timedelta
import uuid

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

BUCKET_NAME = os.environ['S3_BUCKET_NAME']
TABLE_NAME = os.environ['DYNAMODB_TABLE']
table = dynamodb.Table(TABLE_NAME)

def handler(event, context):
    """Main Lambda handler"""
    print(f"Event: {json.dumps(event)}")
    
    # Get HTTP method and path
    http_method = event.get('requestContext', {}).get('http', {}).get('method')
    path = event.get('requestContext', {}).get('http', {}).get('path', '')
    
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    }
    
    try:
        # Handle OPTIONS for CORS
        if http_method == 'OPTIONS':
            return {'statusCode': 200, 'headers': headers, 'body': ''}
        
        # Route based on path
        if '/recordings/upload-url' in path and http_method == 'POST':
            return get_upload_url(event, headers)
        elif '/recordings' in path and http_method == 'GET':
            return list_recordings(event, headers)
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'Not found'})
            }
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


def get_upload_url(event, headers):
    """Generate presigned S3 URL for recording upload"""
    try:
        body = json.loads(event.get('body', '{}'))
        room_id = body.get('room_id')
        filename = body.get('filename', f'recording-{uuid.uuid4()}.webm')
        content_type = body.get('contentType', 'video/webm')
        size = body.get('size', 0)
        
        if not room_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'room_id is required'})
            }
        
        # Get user from authorization header
        user_id = get_user_from_token(event)
        if not user_id:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Generate S3 key
        timestamp = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
        s3_key = f'recordings/{room_id}/{timestamp}-{filename}'
        
        # Generate presigned URL (valid for 30 minutes)
        upload_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key,
                'ContentType': content_type
            },
            ExpiresIn=1800  # 30 minutes
        )
        
        # Save metadata to DynamoDB
        recording_id = str(uuid.uuid4())
        table.put_item(Item={
            'PK': f'RECORDING#{recording_id}',
            'SK': f'METADATA#{timestamp}',
            'recording_id': recording_id,
            'room_id': room_id,
            'user_id': user_id,
            's3_key': s3_key,
            's3_bucket': BUCKET_NAME,
            'filename': filename,
            'content_type': content_type,
            'size': size,
            'status': 'uploading',
            'created_at': datetime.utcnow().isoformat(),
            'ttl': int((datetime.utcnow() + timedelta(days=30)).timestamp())
        })
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'upload_url': upload_url,
                'recording_id': recording_id,
                's3_key': s3_key,
                'expires_in': 1800
            })
        }
    
    except Exception as e:
        print(f"Error generating upload URL: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


def list_recordings(event, headers):
    """List recordings for a room or user"""
    try:
        params = event.get('queryStringParameters', {}) or {}
        room_id = params.get('room_id')
        
        # Get user from authorization header
        user_id = get_user_from_token(event)
        if not user_id:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Unauthorized'})
            }
        
        # Query DynamoDB
        if room_id:
            # Get recordings for specific room
            response = table.scan(
                FilterExpression='begins_with(PK, :pk) AND room_id = :room_id',
                ExpressionAttributeValues={
                    ':pk': 'RECORDING#',
                    ':room_id': room_id
                }
            )
        else:
            # Get all recordings for user
            response = table.scan(
                FilterExpression='begins_with(PK, :pk) AND user_id = :user_id',
                ExpressionAttributeValues={
                    ':pk': 'RECORDING#',
                    ':user_id': user_id
                }
            )
        
        recordings = response.get('Items', [])
        
        # Generate download URLs for completed recordings
        for recording in recordings:
            if recording.get('status') == 'completed':
                recording['download_url'] = s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': recording['s3_bucket'],
                        'Key': recording['s3_key']
                    },
                    ExpiresIn=3600  # 1 hour
                )
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'recordings': recordings})
        }
    
    except Exception as e:
        print(f"Error listing recordings: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }


def get_user_from_token(event):
    """Extract user ID from JWT token in Authorization header"""
    try:
        import jwt
        
        auth_header = event.get('headers', {}).get('authorization') or event.get('headers', {}).get('Authorization')
        if not auth_header:
            return None
        
        token = auth_header.replace('Bearer ', '')
        secret = os.environ.get('JWT_SECRET_KEY', '')
        
        decoded = jwt.decode(token, secret, algorithms=['HS256'])
        return decoded.get('sub')
    except Exception as e:
        print(f"Error decoding token: {str(e)}")
        return None

