from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..auth.dependencies import get_current_active_user
from ..models.models import User, Call, Conversation, Participant, CallStatus, Recording

router = APIRouter(prefix="/calls", tags=["calls"])


class CallInitiate(BaseModel):
    conversation_id: int


class CallResponse(BaseModel):
    id: int
    conversation_id: int
    initiator_id: Optional[int]
    status: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration: Optional[int]

    class Config:
        from_attributes = True


class CallEndRequest(BaseModel):
    duration: Optional[int] = None


class RecordingUploadRequest(BaseModel):
    s3_key: str
    s3_bucket: str
    file_size: Optional[int] = None
    duration: Optional[int] = None


class RecordingResponse(BaseModel):
    id: int
    call_id: int
    s3_key: str
    s3_bucket: str
    file_size: Optional[int]
    duration: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/initiate", response_model=CallResponse, status_code=status.HTTP_201_CREATED)
async def initiate_call(
    call_data: CallInitiate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Initiate a video call"""
    # Check if user is participant
    participant = db.query(Participant).filter(
        Participant.conversation_id == call_data.conversation_id,
        Participant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this conversation"
        )
    
    # Check if there's an active call
    active_call = db.query(Call).filter(
        Call.conversation_id == call_data.conversation_id,
        Call.status.in_([CallStatus.INITIATED, CallStatus.RINGING, CallStatus.ACTIVE])
    ).first()
    
    if active_call:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="There is already an active call in this conversation"
        )
    
    # Create new call
    call = Call(
        conversation_id=call_data.conversation_id,
        initiator_id=current_user.id,
        status=CallStatus.INITIATED
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    
    return call


@router.post("/{call_id}/accept", response_model=CallResponse)
async def accept_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Accept an incoming call"""
    call = db.query(Call).filter(Call.id == call_id).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Check if user is participant
    participant = db.query(Participant).filter(
        Participant.conversation_id == call.conversation_id,
        Participant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this conversation"
        )
    
    if call.status not in [CallStatus.INITIATED, CallStatus.RINGING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Call cannot be accepted in current status"
        )
    
    call.status = CallStatus.ACTIVE
    db.commit()
    db.refresh(call)
    
    return call


@router.post("/{call_id}/reject", response_model=CallResponse)
async def reject_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reject an incoming call"""
    call = db.query(Call).filter(Call.id == call_id).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Check if user is participant
    participant = db.query(Participant).filter(
        Participant.conversation_id == call.conversation_id,
        Participant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this conversation"
        )
    
    call.status = CallStatus.REJECTED
    call.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(call)
    
    return call


@router.post("/{call_id}/end", response_model=CallResponse)
async def end_call(
    call_id: int,
    end_data: CallEndRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """End an active call"""
    call = db.query(Call).filter(Call.id == call_id).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Check if user is participant
    participant = db.query(Participant).filter(
        Participant.conversation_id == call.conversation_id,
        Participant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this conversation"
        )
    
    call.status = CallStatus.ENDED
    call.ended_at = datetime.utcnow()
    if end_data.duration:
        call.duration = end_data.duration
    
    db.commit()
    db.refresh(call)
    
    return call


@router.post("/{call_id}/recording", response_model=RecordingResponse, status_code=status.HTTP_201_CREATED)
async def upload_recording(
    call_id: int,
    recording_data: RecordingUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Register a call recording"""
    call = db.query(Call).filter(Call.id == call_id).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Check if user is participant
    participant = db.query(Participant).filter(
        Participant.conversation_id == call.conversation_id,
        Participant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this conversation"
        )
    
    # Create recording entry
    recording = Recording(
        call_id=call_id,
        s3_key=recording_data.s3_key,
        s3_bucket=recording_data.s3_bucket,
        file_size=recording_data.file_size,
        duration=recording_data.duration
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)
    
    return recording


@router.get("/{call_id}", response_model=CallResponse)
async def get_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get call details"""
    call = db.query(Call).filter(Call.id == call_id).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Check if user is participant
    participant = db.query(Participant).filter(
        Participant.conversation_id == call.conversation_id,
        Participant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this conversation"
        )
    
    return call


@router.get("/{call_id}/recordings", response_model=List[RecordingResponse])
async def get_recordings(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get recordings for a call"""
    call = db.query(Call).filter(Call.id == call_id).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Check if user is participant
    participant = db.query(Participant).filter(
        Participant.conversation_id == call.conversation_id,
        Participant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this conversation"
        )
    
    recordings = db.query(Recording).filter(Recording.call_id == call_id).all()
    return recordings

