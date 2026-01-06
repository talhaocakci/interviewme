from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..auth.dependencies import get_current_active_user
from ..models.models import User
from ..services.s3_service import s3_service

router = APIRouter(prefix="/upload", tags=["upload"])


class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str = "application/octet-stream"


class PresignedUrlResponse(BaseModel):
    upload_url: str
    file_key: str


@router.post("/presigned-url", response_model=PresignedUrlResponse)
async def get_presigned_upload_url(
    request: PresignedUrlRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Get a presigned URL for uploading files to S3"""
    try:
        # Generate unique key
        file_key = f"uploads/{current_user.id}/{request.filename}"
        
        # Generate presigned URL
        upload_url = s3_service.generate_presigned_upload_url(
            key=file_key,
            content_type=request.content_type,
            expires_in=3600  # 1 hour
        )
        
        if not upload_url:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate upload URL"
            )
        
        return PresignedUrlResponse(
            upload_url=upload_url,
            file_key=file_key
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating presigned URL: {str(e)}"
        )


class DownloadUrlRequest(BaseModel):
    file_key: str


class DownloadUrlResponse(BaseModel):
    download_url: str


@router.post("/download-url", response_model=DownloadUrlResponse)
async def get_presigned_download_url(
    request: DownloadUrlRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Get a presigned URL for downloading files from S3"""
    try:
        download_url = s3_service.generate_presigned_download_url(
            key=request.file_key,
            expires_in=3600  # 1 hour
        )
        
        if not download_url:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate download URL"
            )
        
        return DownloadUrlResponse(download_url=download_url)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating download URL: {str(e)}"
        )

