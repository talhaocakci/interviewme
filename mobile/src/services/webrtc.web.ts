// Web version using browser's native WebRTC API
import { WEBRTC_CONFIG } from '../utils/constants';
import socketService from './socket';

class WebRTCService {
  private peerConnections: Map<number, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private currentCallId: number | null = null;

  async getLocalStream(audio = true, video = true): Promise<MediaStream> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      const constraints: MediaStreamConstraints = {
        audio,
        video: video ? {
          facingMode: 'user',
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        } : false,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
      
    } catch (error: any) {
      let friendlyMessage = error.message || 'Unknown error';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        friendlyMessage = 'Camera/microphone access denied. Please allow access and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        friendlyMessage = 'No camera or microphone found on your device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        friendlyMessage = 'Camera/microphone is already in use by another application.';
      } else if (error.name === 'OverconstrainedError') {
        friendlyMessage = 'Camera constraints could not be satisfied.';
      }
      
      const wrappedError = new Error(friendlyMessage);
      wrappedError.name = error.name;
      throw wrappedError;
    }
  }

  async createPeerConnection(callId: number, userId: number): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection(WEBRTC_CONFIG);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream) {
          peerConnection.addTrack(track, this.localStream);
        }
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
        // Don't dispatch to Redux - MediaStream can't be serialized
        // Store it locally for now
        console.log('Remote stream received:', event.streams[0]);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed' || 
          peerConnection.connectionState === 'disconnected' ||
          peerConnection.connectionState === 'closed') {
        this.removePeerConnection(userId);
      }
    };

    this.peerConnections.set(userId, peerConnection);
    return peerConnection;
  }

  async createOffer(callId: number, userId: number): Promise<RTCSessionDescriptionInit> {
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

  async handleOffer(callId: number, userId: number, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
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

  async handleAnswer(userId: number, answer: RTCSessionDescriptionInit) {
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

  async handleIceCandidate(userId: number, candidate: RTCIceCandidateInit) {
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

  async switchCamera() {
    console.log('Camera switching not supported on web');
    // On web, we can switch between front/back cameras if available
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        const currentFacingMode = videoTrack.getSettings().facingMode;
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        
        // Stop current track
        videoTrack.stop();
        
        // Get new stream with opposite camera
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: newFacingMode }
          });
          
          const newTrack = newStream.getVideoTracks()[0];
          
          // Replace track in all peer connections
          this.peerConnections.forEach((pc) => {
            const senders = pc.getSenders();
            const videoSender = senders.find(sender => sender.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(newTrack);
            }
          });
          
          // Update local stream
          this.localStream.removeTrack(videoTrack);
          this.localStream.addTrack(newTrack);
        } catch (error) {
          console.error('Error switching camera:', error);
        }
      }
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

