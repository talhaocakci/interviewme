from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..auth.dependencies import get_current_active_user
from ..models.models import User, Conversation, Participant, Message

router = APIRouter(prefix="/conversations", tags=["conversations"])


class ConversationCreate(BaseModel):
    participant_ids: List[int]
    name: Optional[str] = None
    is_group: bool = False


class ConversationResponse(BaseModel):
    id: int
    name: Optional[str]
    is_group: bool
    avatar_url: Optional[str]
    created_at: datetime
    last_message_at: Optional[datetime]
    participants: List[dict]

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: Optional[str] = None
    message_type: str = "text"
    media_url: Optional[str] = None
    reply_to_id: Optional[int] = None


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: Optional[int]
    content: Optional[str]
    message_type: str
    media_url: Optional[str]
    reply_to_id: Optional[int]
    created_at: datetime
    is_deleted: bool

    class Config:
        from_attributes = True


@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new conversation"""
    # Validate participants
    if not conversation_data.participant_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one participant required"
        )
    
    # Check if 1-on-1 conversation already exists
    if not conversation_data.is_group and len(conversation_data.participant_ids) == 1:
        other_user_id = conversation_data.participant_ids[0]
        existing = db.query(Conversation).join(Participant).filter(
            Conversation.is_group == False,
            Participant.user_id.in_([current_user.id, other_user_id])
        ).group_by(Conversation.id).having(
            db.func.count(Participant.id) == 2
        ).first()
        
        if existing:
            # Return existing conversation
            participants = db.query(Participant).filter(
                Participant.conversation_id == existing.id
            ).all()
            
            return ConversationResponse(
                id=existing.id,
                name=existing.name,
                is_group=existing.is_group,
                avatar_url=existing.avatar_url,
                created_at=existing.created_at,
                last_message_at=existing.last_message_at,
                participants=[{"id": p.user_id} for p in participants]
            )
    
    # Create new conversation
    conversation = Conversation(
        name=conversation_data.name,
        is_group=conversation_data.is_group
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    # Add current user as participant
    participant = Participant(
        conversation_id=conversation.id,
        user_id=current_user.id,
        is_admin=True
    )
    db.add(participant)
    
    # Add other participants
    for user_id in conversation_data.participant_ids:
        if user_id != current_user.id:
            participant = Participant(
                conversation_id=conversation.id,
                user_id=user_id
            )
            db.add(participant)
    
    db.commit()
    
    # Get all participants
    participants = db.query(Participant).filter(
        Participant.conversation_id == conversation.id
    ).all()
    
    return ConversationResponse(
        id=conversation.id,
        name=conversation.name,
        is_group=conversation.is_group,
        avatar_url=conversation.avatar_url,
        created_at=conversation.created_at,
        last_message_at=conversation.last_message_at,
        participants=[{"id": p.user_id} for p in participants]
    )


@router.get("/", response_model=List[ConversationResponse])
async def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all conversations for current user"""
    # Get conversations where user is a participant
    conversations = db.query(Conversation).join(Participant).filter(
        Participant.user_id == current_user.id,
        Participant.left_at.is_(None)
    ).order_by(Conversation.last_message_at.desc()).all()
    
    result = []
    for conv in conversations:
        participants = db.query(Participant).filter(
            Participant.conversation_id == conv.id
        ).all()
        
        result.append(ConversationResponse(
            id=conv.id,
            name=conv.name,
            is_group=conv.is_group,
            avatar_url=conv.avatar_url,
            created_at=conv.created_at,
            last_message_at=conv.last_message_at,
            participants=[{"id": p.user_id} for p in participants]
        ))
    
    return result


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get conversation by ID"""
    # Check if user is participant
    participant = db.query(Participant).filter(
        Participant.conversation_id == conversation_id,
        Participant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this conversation"
        )
    
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    participants = db.query(Participant).filter(
        Participant.conversation_id == conversation_id
    ).all()
    
    return ConversationResponse(
        id=conversation.id,
        name=conversation.name,
        is_group=conversation.is_group,
        avatar_url=conversation.avatar_url,
        created_at=conversation.created_at,
        last_message_at=conversation.last_message_at,
        participants=[{"id": p.user_id} for p in participants]
    )


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: int,
    limit: int = 50,
    before_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get messages from a conversation"""
    # Check if user is participant
    participant = db.query(Participant).filter(
        Participant.conversation_id == conversation_id,
        Participant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this conversation"
        )
    
    query = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.is_deleted == False
    )
    
    if before_id:
        query = query.filter(Message.id < before_id)
    
    messages = query.order_by(Message.created_at.desc()).limit(limit).all()
    messages.reverse()  # Return in chronological order
    
    return messages


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    conversation_id: int,
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a message to a conversation"""
    # Check if user is participant
    participant = db.query(Participant).filter(
        Participant.conversation_id == conversation_id,
        Participant.user_id == current_user.id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant of this conversation"
        )
    
    # Create message
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
        media_url=message_data.media_url,
        reply_to_id=message_data.reply_to_id
    )
    db.add(message)
    
    # Update conversation last_message_at
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    conversation.last_message_at = datetime.utcnow()
    
    db.commit()
    db.refresh(message)
    
    return message

