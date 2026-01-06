import socketio
from typing import Dict, Set, Optional
import logging
from datetime import datetime

from ..database import SessionLocal
from ..models.models import User, Message, Conversation, Participant, Call, CallStatus
from ..services.webrtc_signaling import webrtc_service
from ..auth.service import auth_service

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)


class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        # Store user_id -> sid mapping
        self.user_connections: Dict[int, str] = {}
        # Store sid -> user_id mapping
        self.sid_to_user: Dict[str, int] = {}
        # Store conversation_id -> Set[sid] mapping
        self.conversation_rooms: Dict[int, Set[str]] = {}
    
    def add_connection(self, sid: str, user_id: int):
        """Add a new connection"""
        self.user_connections[user_id] = sid
        self.sid_to_user[sid] = user_id
        logger.info(f"User {user_id} connected with sid {sid}")
    
    def remove_connection(self, sid: str):
        """Remove a connection"""
        user_id = self.sid_to_user.pop(sid, None)
        if user_id:
            self.user_connections.pop(user_id, None)
            logger.info(f"User {user_id} disconnected")
    
    def get_user_sid(self, user_id: int) -> Optional[str]:
        """Get SID for a user"""
        return self.user_connections.get(user_id)
    
    def get_user_id(self, sid: str) -> Optional[int]:
        """Get user ID for a SID"""
        return self.sid_to_user.get(sid)
    
    def join_conversation(self, conversation_id: int, sid: str):
        """Add user to conversation room"""
        if conversation_id not in self.conversation_rooms:
            self.conversation_rooms[conversation_id] = set()
        self.conversation_rooms[conversation_id].add(sid)
    
    def leave_conversation(self, conversation_id: int, sid: str):
        """Remove user from conversation room"""
        if conversation_id in self.conversation_rooms:
            self.conversation_rooms[conversation_id].discard(sid)


manager = ConnectionManager()


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    try:
        # Extract token from auth
        token = auth.get('token') if auth else None
        
        if not token:
            logger.warning(f"Connection {sid} rejected: No token provided")
            return False
        
        # Verify token
        payload = auth_service.verify_token(token)
        if not payload:
            logger.warning(f"Connection {sid} rejected: Invalid token")
            return False
        
        user_id = int(payload.get("sub"))
        
        # Add connection
        manager.add_connection(sid, user_id)
        
        # Update user last_seen
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.last_seen = datetime.utcnow()
                db.commit()
        finally:
            db.close()
        
        logger.info(f"User {user_id} connected successfully")
        
    except Exception as e:
        logger.error(f"Error in connect: {e}")
        return False


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    try:
        user_id = manager.get_user_id(sid)
        if user_id:
            # Update user last_seen
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.last_seen = datetime.utcnow()
                    db.commit()
            finally:
                db.close()
        
        manager.remove_connection(sid)
        
    except Exception as e:
        logger.error(f"Error in disconnect: {e}")


@sio.event
async def join_conversation(sid, data):
    """Join a conversation room"""
    try:
        user_id = manager.get_user_id(sid)
        if not user_id:
            return {"error": "Not authenticated"}
        
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return {"error": "Missing conversation_id"}
        
        # Verify user is participant
        db = SessionLocal()
        try:
            participant = db.query(Participant).filter(
                Participant.conversation_id == conversation_id,
                Participant.user_id == user_id
            ).first()
            
            if not participant:
                return {"error": "Not a participant"}
            
            # Join room
            await sio.enter_room(sid, f"conversation_{conversation_id}")
            manager.join_conversation(conversation_id, sid)
            
            return {"status": "joined"}
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Error in join_conversation: {e}")
        return {"error": str(e)}


@sio.event
async def send_message(sid, data):
    """Send a message to a conversation"""
    try:
        user_id = manager.get_user_id(sid)
        if not user_id:
            return {"error": "Not authenticated"}
        
        conversation_id = data.get('conversation_id')
        content = data.get('content')
        message_type = data.get('message_type', 'text')
        media_url = data.get('media_url')
        reply_to_id = data.get('reply_to_id')
        
        if not conversation_id:
            return {"error": "Missing conversation_id"}
        
        db = SessionLocal()
        try:
            # Verify user is participant
            participant = db.query(Participant).filter(
                Participant.conversation_id == conversation_id,
                Participant.user_id == user_id
            ).first()
            
            if not participant:
                return {"error": "Not a participant"}
            
            # Create message
            message = Message(
                conversation_id=conversation_id,
                sender_id=user_id,
                content=content,
                message_type=message_type,
                media_url=media_url,
                reply_to_id=reply_to_id
            )
            db.add(message)
            
            # Update conversation
            conversation = db.query(Conversation).filter(
                Conversation.id == conversation_id
            ).first()
            if conversation:
                conversation.last_message_at = datetime.utcnow()
            
            db.commit()
            db.refresh(message)
            
            # Broadcast to conversation room
            await sio.emit(
                'new_message',
                {
                    'id': message.id,
                    'conversation_id': message.conversation_id,
                    'sender_id': message.sender_id,
                    'content': message.content,
                    'message_type': message.message_type,
                    'media_url': message.media_url,
                    'reply_to_id': message.reply_to_id,
                    'created_at': message.created_at.isoformat(),
                },
                room=f"conversation_{conversation_id}"
            )
            
            return {"status": "sent", "message_id": message.id}
        
        finally:
            db.close()
    
    except Exception as e:
        logger.error(f"Error in send_message: {e}")
        return {"error": str(e)}


@sio.event
async def typing(sid, data):
    """Send typing indicator"""
    try:
        user_id = manager.get_user_id(sid)
        if not user_id:
            return
        
        conversation_id = data.get('conversation_id')
        is_typing = data.get('is_typing', True)
        
        if not conversation_id:
            return
        
        # Broadcast to conversation room (except sender)
        await sio.emit(
            'user_typing',
            {
                'user_id': user_id,
                'conversation_id': conversation_id,
                'is_typing': is_typing
            },
            room=f"conversation_{conversation_id}",
            skip_sid=sid
        )
    
    except Exception as e:
        logger.error(f"Error in typing: {e}")


@sio.event
async def call_offer(sid, data):
    """Handle WebRTC call offer"""
    try:
        user_id = manager.get_user_id(sid)
        if not user_id:
            return {"error": "Not authenticated"}
        
        call_id = data.get('call_id')
        target_user_id = data.get('target_user_id')
        offer = data.get('offer')
        
        if not all([call_id, target_user_id, offer]):
            return {"error": "Missing required fields"}
        
        # Add peer to call
        webrtc_service.add_peer_to_call(call_id, user_id, {'offer': offer})
        
        # Send offer to target user
        target_sid = manager.get_user_sid(target_user_id)
        if target_sid:
            await sio.emit(
                'call_offer',
                {
                    'call_id': call_id,
                    'from_user_id': user_id,
                    'offer': offer
                },
                to=target_sid
            )
        
        return {"status": "sent"}
    
    except Exception as e:
        logger.error(f"Error in call_offer: {e}")
        return {"error": str(e)}


@sio.event
async def call_answer(sid, data):
    """Handle WebRTC call answer"""
    try:
        user_id = manager.get_user_id(sid)
        if not user_id:
            return {"error": "Not authenticated"}
        
        call_id = data.get('call_id')
        target_user_id = data.get('target_user_id')
        answer = data.get('answer')
        
        if not all([call_id, target_user_id, answer]):
            return {"error": "Missing required fields"}
        
        # Send answer to target user
        target_sid = manager.get_user_sid(target_user_id)
        if target_sid:
            await sio.emit(
                'call_answer',
                {
                    'call_id': call_id,
                    'from_user_id': user_id,
                    'answer': answer
                },
                to=target_sid
            )
        
        return {"status": "sent"}
    
    except Exception as e:
        logger.error(f"Error in call_answer: {e}")
        return {"error": str(e)}


@sio.event
async def ice_candidate(sid, data):
    """Handle ICE candidate exchange"""
    try:
        user_id = manager.get_user_id(sid)
        if not user_id:
            return {"error": "Not authenticated"}
        
        call_id = data.get('call_id')
        target_user_id = data.get('target_user_id')
        candidate = data.get('candidate')
        
        if not all([call_id, candidate]):
            return {"error": "Missing required fields"}
        
        # If target specified, send to specific user
        if target_user_id:
            target_sid = manager.get_user_sid(target_user_id)
            if target_sid:
                await sio.emit(
                    'ice_candidate',
                    {
                        'call_id': call_id,
                        'from_user_id': user_id,
                        'candidate': candidate
                    },
                    to=target_sid
                )
        else:
            # Broadcast to all peers in call
            peers = webrtc_service.get_call_peers(call_id)
            for peer_id in peers.keys():
                if peer_id != user_id:
                    peer_sid = manager.get_user_sid(peer_id)
                    if peer_sid:
                        await sio.emit(
                            'ice_candidate',
                            {
                                'call_id': call_id,
                                'from_user_id': user_id,
                                'candidate': candidate
                            },
                            to=peer_sid
                        )
        
        return {"status": "sent"}
    
    except Exception as e:
        logger.error(f"Error in ice_candidate: {e}")
        return {"error": str(e)}


@sio.event
async def call_ended(sid, data):
    """Handle call end"""
    try:
        user_id = manager.get_user_id(sid)
        if not user_id:
            return {"error": "Not authenticated"}
        
        call_id = data.get('call_id')
        
        if not call_id:
            return {"error": "Missing call_id"}
        
        # Remove peer from call
        webrtc_service.remove_peer_from_call(call_id, user_id)
        
        # Notify other peers
        peers = webrtc_service.get_call_peers(call_id)
        for peer_id in peers.keys():
            peer_sid = manager.get_user_sid(peer_id)
            if peer_sid:
                await sio.emit(
                    'peer_left',
                    {
                        'call_id': call_id,
                        'user_id': user_id
                    },
                    to=peer_sid
                )
        
        # If no peers left, end call
        if not peers:
            webrtc_service.end_call(call_id)
            
            # Update call status in database
            db = SessionLocal()
            try:
                call = db.query(Call).filter(Call.id == call_id).first()
                if call and call.status != CallStatus.ENDED:
                    call.status = CallStatus.ENDED
                    call.ended_at = datetime.utcnow()
                    if call.started_at:
                        duration = (datetime.utcnow() - call.started_at).total_seconds()
                        call.duration = int(duration)
                    db.commit()
            finally:
                db.close()
        
        return {"status": "ended"}
    
    except Exception as e:
        logger.error(f"Error in call_ended: {e}")
        return {"error": str(e)}

