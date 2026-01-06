import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WS_URL, STORAGE_KEYS } from '../utils/constants';
import { store } from '../store';
import { addMessage, setTypingUsers } from '../store/slices/chatSlice';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  async connect() {
    // Socket.IO disabled for now - will be replaced with native WebSocket for API Gateway
    return;
    
    /* COMMENTED OUT UNTIL WEBSOCKET BACKEND IS READY
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      console.error('No auth token available');
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupListeners();
    */
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Chat events
    this.socket.on('new_message', (data) => {
      console.log('New message received:', data);
      store.dispatch(addMessage(data));
    });

    this.socket.on('user_typing', (data) => {
      console.log('User typing:', data);
      store.dispatch(setTypingUsers({
        conversationId: data.conversation_id,
        userId: data.user_id,
        isTyping: data.is_typing,
      }));
    });

    // Call events - handled by WebRTC service
    this.socket.on('call_offer', (data) => {
      console.log('Call offer received:', data);
      // Will be handled by WebRTC service
    });

    this.socket.on('call_answer', (data) => {
      console.log('Call answer received:', data);
      // Will be handled by WebRTC service
    });

    this.socket.on('ice_candidate', (data) => {
      console.log('ICE candidate received:', data);
      // Will be handled by WebRTC service
    });

    this.socket.on('peer_left', (data) => {
      console.log('Peer left:', data);
      // Will be handled by WebRTC service
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Join conversation room
  joinConversation(conversationId: number) {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', { conversation_id: conversationId });
    }
  }

  // Send message
  sendMessage(data: {
    conversation_id: number;
    content?: string;
    message_type?: string;
    media_url?: string;
    reply_to_id?: number;
  }) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', data);
    }
  }

  // Send typing indicator
  sendTyping(conversationId: number, isTyping: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('typing', {
        conversation_id: conversationId,
        is_typing: isTyping,
      });
    }
  }

  // WebRTC signaling
  sendCallOffer(callId: number, targetUserId: number, offer: any) {
    if (this.socket?.connected) {
      this.socket.emit('call_offer', {
        call_id: callId,
        target_user_id: targetUserId,
        offer,
      });
    }
  }

  sendCallAnswer(callId: number, targetUserId: number, answer: any) {
    if (this.socket?.connected) {
      this.socket.emit('call_answer', {
        call_id: callId,
        target_user_id: targetUserId,
        answer,
      });
    }
  }

  sendIceCandidate(callId: number, targetUserId: number | null, candidate: any) {
    if (this.socket?.connected) {
      this.socket.emit('ice_candidate', {
        call_id: callId,
        target_user_id: targetUserId,
        candidate,
      });
    }
  }

  endCall(callId: number) {
    if (this.socket?.connected) {
      this.socket.emit('call_ended', { call_id: callId });
    }
  }

  // Listen to socket events
  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  getSocket() {
    return this.socket;
  }

  isSocketConnected() {
    return this.isConnected;
  }
}

export default new SocketService();

