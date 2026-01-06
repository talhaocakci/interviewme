import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import apiService from '../services/api';
import roomWebSocket from '../services/roomWebSocket';
import { API_BASE_URL } from '../utils/constants';

export default function VideoRoomScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { roomId } = route.params as { roomId: string };
  
  const [loading, setLoading] = useState(true);
  const [roomData, setRoomData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState('Requesting camera access...');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const setLocalVideoRef = (element: HTMLVideoElement | null) => {
    localVideoRef.current = element;
    console.log('Local video ref callback:', element ? 'Element set' : 'Element null');
    
    // If we already have a stream and the element just mounted, attach it
    if (element && localStreamRef.current) {
      console.log('📹 Attaching existing stream to newly mounted video element');
      element.srcObject = localStreamRef.current;
      element.play().catch(e => console.error('Error playing video:', e));
    }
  };

  const setRemoteVideoRef = (element: HTMLVideoElement | null) => {
    remoteVideoRef.current = element;
    console.log('Remote video ref callback:', element ? 'Element set' : 'Element null');
  };

  useEffect(() => {
    loadRoom();
    
    // Cleanup on component unmount or room change
    return () => {
      cleanup();
    };
  }, [roomId]);

  const loadRoom = async () => {
    try {
      // Get room details
      const data = await apiService.getRoom(roomId);
      setRoomData(data);
      
      // First stop loading to render the UI (including video elements)
      setLoading(false);
      
      // Wait a bit for video elements to mount
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Start the call to get local stream
      await startCall();
      
      // Connect to WebSocket (this will increment the participant count)
      await roomWebSocket.connect(roomId);
      
      // Setup WebSocket listeners
      setupWebSocketListeners();
      
    } catch (err: any) {
      console.error('Error loading room:', err);
      setError(err.response?.data?.error || 'Failed to load room');
      setLoading(false);
    }
  };

  const setupWebSocketListeners = () => {
    roomWebSocket.on('peers_list', handlePeersList);
    roomWebSocket.on('peer_joined', handlePeerJoined);
    roomWebSocket.on('peer_left', handlePeerLeft);
    roomWebSocket.on('offer', handleOffer);
    roomWebSocket.on('answer', handleAnswer);
    roomWebSocket.on('ice-candidate', handleIceCandidate);
  };

  const startCall = async () => {
    try {
      setCameraStatus('Requesting camera and microphone access...');
      console.log('Requesting camera and microphone access...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      // Wait a bit for refs to be set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      console.log('✅ Got media stream:', stream.id);
      console.log('Video tracks:', stream.getVideoTracks().length);
      console.log('Audio tracks:', stream.getAudioTracks().length);
      
      localStreamRef.current = stream;
      
      // Display local video
      if (localVideoRef.current) {
        console.log('✅ Local video ref found, setting srcObject');
        localVideoRef.current.srcObject = stream;
        
        // Ensure video plays
        try {
          await localVideoRef.current.play();
          console.log('✅ Local video playing');
          setCameraStatus('Camera active');
        } catch (playErr) {
          console.error('Error playing local video:', playErr);
        }
      } else {
        console.error('❌ Local video ref is null!');
        // Retry once after a delay
        setTimeout(() => {
          if (localVideoRef.current && localStreamRef.current) {
            console.log('🔄 Retrying video attachment...');
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(e => console.error('Retry failed:', e));
          }
        }, 500);
      }
      
      setIsCallActive(true);
    } catch (err: any) {
      console.error('❌ Error starting call:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      
      let errorMessage = 'Failed to access camera/microphone';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone permission denied. Please allow access and refresh.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera/microphone found on this device.';
      }
      
      setCameraStatus(errorMessage);
      setError(errorMessage);
    }
  };

  const handlePeersList = (data: any) => {
    console.log('📋 Peers in room:', data.peers);
    
    // If there are peers, create offer to the first one (we are the joiner, they are waiting)
    if (data.peers && data.peers.length > 0) {
      const peerId = data.peers[0];
      console.log('🤝 Found existing peer, I will create the offer:', peerId);
      setRemotePeerId(peerId);
      createPeerConnection(peerId);
      createOffer(peerId);
    } else {
      console.log('👤 No other peers in room yet, waiting...');
    }
  };

  const handlePeerJoined = (data: any) => {
    console.log('✅ Peer joined:', data.connection_id);
    
    // If we don't have a peer yet, create connection but DON'T create offer
    // Wait for them to send us an offer (they joined, they should initiate)
    if (!remotePeerId) {
      console.log('🤝 New peer joined, creating connection and waiting for their offer:', data.connection_id);
      setRemotePeerId(data.connection_id);
      createPeerConnection(data.connection_id);
      // DO NOT create offer - let them do it since they joined after us
    } else {
      console.log('⚠️ Already connected to a peer, ignoring new peer');
    }
  };

  const handlePeerLeft = (data: any) => {
    console.log('Peer left:', data.connection_id);
    
    if (remotePeerId === data.connection_id) {
      setRemotePeerId(null);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Clear remote video
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }
  };

  const createPeerConnection = (peerId: string) => {
    console.log('🔗 Creating peer connection for:', peerId);
    
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };
    
    const pc = new RTCPeerConnection(config);
    peerConnectionRef.current = pc;
    
    // Add local tracks to peer connection
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      console.log(`Adding ${tracks.length} local tracks to peer connection`);
      tracks.forEach(track => {
        console.log(`  - ${track.kind} track: ${track.label}`);
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.error('❌ No local stream to add to peer connection!');
    }
    
    // Handle remote track
    pc.ontrack = (event) => {
      console.log('📹 Received remote track:', event.track.kind);
      console.log('Remote streams:', event.streams.length);
      
      if (remoteVideoRef.current && event.streams[0]) {
        console.log('Setting remote video srcObject');
        remoteVideoRef.current.srcObject = event.streams[0];
        
        // Try to play
        remoteVideoRef.current.play()
          .then(() => console.log('✅ Remote video playing'))
          .catch(e => console.error('Error playing remote video:', e));
      } else {
        console.error('❌ Remote video ref is null or no streams!');
      }
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('📤 Sending ICE candidate to:', peerId);
        roomWebSocket.sendIceCandidate(peerId, {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        });
      } else {
        console.log('✅ All ICE candidates sent');
      }
    };
    
    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state:', pc.iceConnectionState);
    };
    
    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log('🔌 Connection state:', pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        console.log('✅✅✅ PEER CONNECTION ESTABLISHED! ✅✅✅');
      } else if (pc.connectionState === 'failed') {
        console.error('❌ Peer connection failed');
      }
    };
    
    // Handle signaling state
    pc.onsignalingstatechange = () => {
      console.log('📡 Signaling state:', pc.signalingState);
    };
    
    console.log('✅ Peer connection created');
  };

  const createOffer = async (peerId: string) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log('📤 Sending offer to:', peerId);
      // Send the offer object directly (it has type and sdp properties)
      roomWebSocket.sendOffer(peerId, {
        type: offer.type,
        sdp: offer.sdp
      });
    } catch (err) {
      console.error('❌ Error creating offer:', err);
    }
  };

  const handleOffer = async (data: any) => {
    console.log('📥 Received offer from:', data.from);
    console.log('Offer data:', data.data);
    
    const peerId = data.from;
    setRemotePeerId(peerId);
    
    // Create peer connection if not exists
    if (!peerConnectionRef.current) {
      console.log('Creating peer connection for incoming offer');
      createPeerConnection(peerId);
    }
    
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error('❌ No peer connection after creation!');
      return;
    }
    
    try {
      console.log('Setting remote description (offer)');
      await pc.setRemoteDescription(new RTCSessionDescription(data.data));
      console.log('✅ Remote description set');
      
      console.log('Creating answer');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log('✅ Local description (answer) set');
      
      console.log('📤 Sending answer to:', peerId);
      roomWebSocket.sendAnswer(peerId, {
        type: answer.type,
        sdp: answer.sdp
      });
      
      // Process pending ICE candidates
      if (pendingCandidatesRef.current.length > 0) {
        console.log(`Processing ${pendingCandidatesRef.current.length} pending ICE candidates`);
        pendingCandidatesRef.current.forEach(candidate => {
          pc.addIceCandidate(new RTCIceCandidate(candidate));
        });
        pendingCandidatesRef.current = [];
      }
    } catch (err) {
      console.error('❌ Error handling offer:', err);
    }
  };

  const handleAnswer = async (data: any) => {
    console.log('📥 Received answer from:', data.from);
    console.log('Answer data:', data.data);
    
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error('❌ No peer connection for answer!');
      return;
    }
    
    try {
      console.log('Setting remote description (answer)');
      await pc.setRemoteDescription(new RTCSessionDescription(data.data));
      console.log('✅ Remote description (answer) set');
      
      // Process pending ICE candidates
      if (pendingCandidatesRef.current.length > 0) {
        console.log(`Processing ${pendingCandidatesRef.current.length} pending ICE candidates`);
        pendingCandidatesRef.current.forEach(candidate => {
          pc.addIceCandidate(new RTCIceCandidate(candidate));
        });
        pendingCandidatesRef.current = [];
      }
    } catch (err) {
      console.error('❌ Error handling answer:', err);
    }
  };

  const handleIceCandidate = async (data: any) => {
    console.log('📥 Received ICE candidate');
    
    const pc = peerConnectionRef.current;
    
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.data));
        console.log('✅ ICE candidate added');
      } catch (err) {
        console.error('❌ Error adding ICE candidate:', err);
      }
    } else {
      console.log('⏳ Queuing ICE candidate (no remote description yet)');
      pendingCandidatesRef.current.push(data.data);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up room...');
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Disconnect WebSocket (this will decrement the participant count automatically)
    roomWebSocket.disconnect();
    console.log('✅ Cleanup complete');
  };

  const leaveRoom = () => {
    cleanup();
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Loading room...</Text>
      </View>
    );
  }

  if (error && !isCallActive) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Remote Video (Full Screen) */}
      <View style={styles.remoteVideoContainer}>
        <video
          ref={setRemoteVideoRef}
          autoPlay
          playsInline
          style={styles.remoteVideo as any}
        />
        
        {!remotePeerId && (
          <View style={styles.waitingOverlay}>
            <Text style={styles.waitingText}>Waiting for someone to join...</Text>
          </View>
        )}
      </View>

      {/* Local Video (Picture-in-Picture) */}
      <View style={styles.localVideoContainer}>
        <video
          ref={setLocalVideoRef}
          autoPlay
          playsInline
          muted
          style={styles.localVideo as any}
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <IconButton
          icon={isMuted ? 'microphone-off' : 'microphone'}
          mode="contained"
          containerColor={isMuted ? '#f44336' : '#4caf50'}
          iconColor="#fff"
          size={30}
          onPress={toggleMute}
        />
        
        <IconButton
          icon={isVideoOff ? 'video-off' : 'video'}
          mode="contained"
          containerColor={isVideoOff ? '#f44336' : '#4caf50'}
          iconColor="#fff"
          size={30}
          onPress={toggleVideo}
        />
        
        <IconButton
          icon="phone-hangup"
          mode="contained"
          containerColor="#f44336"
          iconColor="#fff"
          size={30}
          onPress={leaveRoom}
        />
      </View>

      {/* Room Info */}
      <View style={styles.roomInfo}>
        <Text style={styles.roomInfoText}>
          {roomData?.name} • {remotePeerId ? 'Connected' : 'Waiting'}
        </Text>
        {!isCallActive && (
          <Text style={styles.cameraStatus}>{cameraStatus}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  waitingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  waitingText: {
    color: '#fff',
    fontSize: 18,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 150,
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  localVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scaleX(-1)', // Mirror local video
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  roomInfo: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 4,
  },
  roomInfoText: {
    color: '#fff',
    fontSize: 14,
  },
  cameraStatus: {
    color: '#ffc107',
    fontSize: 12,
    marginTop: 4,
  },
  text: {
    color: '#fff',
    marginTop: 16,
  },
  errorText: {
    color: '#f44336',
    fontSize: 16,
    marginBottom: 16,
  },
});
