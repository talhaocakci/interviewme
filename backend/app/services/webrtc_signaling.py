from typing import Dict, Set, Optional
import logging

logger = logging.getLogger(__name__)


class WebRTCSignalingService:
    """Service for managing WebRTC signaling"""
    
    def __init__(self):
        # Store active peer connections
        # Format: {call_id: {user_id: connection_info}}
        self.active_calls: Dict[int, Dict[int, dict]] = {}
        
        # Store ICE candidates waiting for peer connection
        # Format: {call_id: {user_id: [ice_candidates]}}
        self.pending_ice_candidates: Dict[int, Dict[int, list]] = {}
    
    def add_peer_to_call(self, call_id: int, user_id: int, connection_info: dict = None):
        """Add a peer to an active call"""
        if call_id not in self.active_calls:
            self.active_calls[call_id] = {}
        
        self.active_calls[call_id][user_id] = connection_info or {}
        logger.info(f"Added peer {user_id} to call {call_id}")
    
    def remove_peer_from_call(self, call_id: int, user_id: int):
        """Remove a peer from an active call"""
        if call_id in self.active_calls:
            self.active_calls[call_id].pop(user_id, None)
            
            # If no peers left, remove call
            if not self.active_calls[call_id]:
                self.active_calls.pop(call_id, None)
                self.pending_ice_candidates.pop(call_id, None)
        
        logger.info(f"Removed peer {user_id} from call {call_id}")
    
    def get_call_peers(self, call_id: int) -> Dict[int, dict]:
        """Get all peers in a call"""
        return self.active_calls.get(call_id, {})
    
    def add_ice_candidate(self, call_id: int, user_id: int, candidate: dict):
        """Store ICE candidate for a peer"""
        if call_id not in self.pending_ice_candidates:
            self.pending_ice_candidates[call_id] = {}
        
        if user_id not in self.pending_ice_candidates[call_id]:
            self.pending_ice_candidates[call_id][user_id] = []
        
        self.pending_ice_candidates[call_id][user_id].append(candidate)
    
    def get_ice_candidates(self, call_id: int, user_id: int) -> list:
        """Get pending ICE candidates for a peer"""
        if call_id not in self.pending_ice_candidates:
            return []
        
        candidates = self.pending_ice_candidates[call_id].get(user_id, [])
        
        # Clear candidates after retrieval
        if user_id in self.pending_ice_candidates[call_id]:
            self.pending_ice_candidates[call_id][user_id] = []
        
        return candidates
    
    def end_call(self, call_id: int):
        """End a call and remove all peers"""
        self.active_calls.pop(call_id, None)
        self.pending_ice_candidates.pop(call_id, None)
        logger.info(f"Ended call {call_id}")


webrtc_service = WebRTCSignalingService()

