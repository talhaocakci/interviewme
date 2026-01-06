/**
 * WebSocket service for video room signaling
 */

import { WS_URL } from '../utils/constants';

type MessageHandler = (data: any) => void;

class RoomWebSocketService {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private connectionId: string | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.roomId = roomId;
      const wsUrl = `${WS_URL}?room_id=${roomId}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected to room:', roomId);
          this.reconnectAttempts = 0;
          
          // Send join message
          this.send({
            type: 'join_room',
            room_id: roomId
          });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket message received:', data.type, data);
            
            // Call all registered handlers for this message type
            const handlers = this.messageHandlers.get(data.type) || [];
            console.log(`Found ${handlers.length} handlers for type: ${data.type}`);
            handlers.forEach(handler => handler(data));
            
            // Also call wildcard handlers
            const wildcardHandlers = this.messageHandlers.get('*') || [];
            wildcardHandlers.forEach(handler => handler(data));
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.handleReconnect();
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.roomId) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        if (this.roomId) {
          this.connect(this.roomId);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('📤 Sending WebSocket message:', data.type);
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('❌ WebSocket is not connected, cannot send:', data.type);
    }
  }

  on(messageType: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);
  }

  off(messageType: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
    this.roomId = null;
    this.connectionId = null;
    this.reconnectAttempts = 0;
  }

  // WebRTC signaling methods
  sendOffer(targetId: string, offer: RTCSessionDescriptionInit) {
    this.send({
      type: 'offer',
      target: targetId,
      data: offer
    });
  }

  sendAnswer(targetId: string, answer: RTCSessionDescriptionInit) {
    this.send({
      type: 'answer',
      target: targetId,
      data: answer
    });
  }

  sendIceCandidate(targetId: string, candidate: RTCIceCandidateInit) {
    this.send({
      type: 'ice-candidate',
      target: targetId,
      data: candidate
    });
  }
}

export default new RoomWebSocketService();

