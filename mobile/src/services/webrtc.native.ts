import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices, MediaStream } from 'react-native-webrtc';
import { WEBRTC_CONFIG } from '../utils/constants';
import socketService from './socket';
import { store } from '../store';
import { setLocalStream, setRemoteStream, removeParticipant } from '../store/slices/callSlice';

class WebRTCService {
  private peerConnections: Map<number, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private currentCallId: number | null = null;

  async getLocalStream(audio = true, video = true): Promise<MediaStream> {
    try {
      const constraints = {
        audio,
        video: video ? {
          facingMode: 'user',
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        } : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      store.dispatch(setLocalStream(stream));
      return stream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }

  async createPeerConnection(callId: number, userId: number): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection(WEBRTC_CONFIG);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to', userId);
        socketService.sendIceCandidate(callId, userId, event.candidate);
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from', userId);
      if (event.streams && event.streams[0]) {
        store.dispatch(setRemoteStream({ userId, stream: event.streams[0] }));
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed' || 
          peerConnection.connectionState === 'disconnected' ||
          peerConnection.connectionState === 'closed') {
        this.removePeerConnection(userId);
        store.dispatch(removeParticipant(userId));
      }
    };

    this.peerConnections.set(userId, peerConnection);
    return peerConnection;
  }

  async createOffer(callId: number, userId: number): Promise<RTCSessionDescription> {
    try {
      const peerConnection = await this.createPeerConnection(callId, userId);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  async handleOffer(callId: number, userId: number, offer: RTCSessionDescription): Promise<RTCSessionDescription> {
    try {
      const peerConnection = await this.createPeerConnection(callId, userId);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      return answer;
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  async handleAnswer(userId: number, answer: RTCSessionDescription) {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(userId: number, candidate: RTCIceCandidate) {
    try {
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  switchCamera() {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track._switchCamera();
      });
    }
  }

  removePeerConnection(userId: number) {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
  }

  async endCall() {
    // Close all peer connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Notify server
    if (this.currentCallId) {
      socketService.endCall(this.currentCallId);
      this.currentCallId = null;
    }
  }

  setCurrentCallId(callId: number) {
    this.currentCallId = callId;
  }

  getCurrentCallId() {
    return this.currentCallId;
  }

  getPeerConnection(userId: number) {
    return this.peerConnections.get(userId);
  }

  getLocalStream() {
    return this.localStream;
  }
}

export default new WebRTCService();

