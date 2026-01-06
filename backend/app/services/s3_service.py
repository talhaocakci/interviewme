import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timedelta
from typing import Optional
import logging

from ..config import settings

logger = logging.getLogger(__name__)


class S3Service:
    def __init__(self):
        self.s3_client = None
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
    
    def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str = "video/webm",
        expires_in: int = 3600
    ) -> Optional[str]:
        """Generate a presigned URL for uploading a file to S3"""
        if not self.s3_client or not settings.AWS_S3_BUCKET:
            logger.error("S3 client not configured")
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': settings.AWS_S3_BUCKET,
                    'Key': key,
                    'ContentType': content_type
                },
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None
    
    def generate_presigned_download_url(
        self,
        key: str,
        expires_in: int = 3600
    ) -> Optional[str]:
        """Generate a presigned URL for downloading a file from S3"""
        if not self.s3_client or not settings.AWS_S3_BUCKET:
            logger.error("S3 client not configured")
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': settings.AWS_S3_BUCKET,
                    'Key': key
                },
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None
    
    def upload_file(self, file_path: str, key: str, content_type: str = "video/webm") -> bool:
        """Upload a file to S3"""
        if not self.s3_client or not settings.AWS_S3_BUCKET:
            logger.error("S3 client not configured")
            return False
        
        try:
            self.s3_client.upload_file(
                file_path,
                settings.AWS_S3_BUCKET,
                key,
                ExtraArgs={'ContentType': content_type}
            )
            return True
        except ClientError as e:
            logger.error(f"Error uploading file: {e}")
            return False
    
    def delete_file(self, key: str) -> bool:
        """Delete a file from S3"""
        if not self.s3_client or not settings.AWS_S3_BUCKET:
            logger.error("S3 client not configured")
            return False
        
        try:
            self.s3_client.delete_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=key
            )
            return True
        except ClientError as e:
            logger.error(f"Error deleting file: {e}")
            return False
    
    def generate_recording_key(self, user_id: int, call_id: int) -> str:
        """Generate S3 key for call recording"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"recordings/{user_id}/{call_id}/{timestamp}.webm"


s3_service = S3Service()

