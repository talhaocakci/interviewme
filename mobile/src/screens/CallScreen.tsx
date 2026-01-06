import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Text, IconButton, Avatar, Button } from 'react-native-paper';

const { width } = Dimensions.get('window');

export default function CallScreen({ navigation }: any) {
  const [callDuration, setCallDuration] = useState(0);
  const [startTime] = useState(Date.now());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [cameraStream, setCameraStream] = useState<any>(null); // Store original camera stream
  
  // Use ref to prevent video element recreation on re-renders
  const videoRef = useRef<HTMLVideoElement>(null);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch(err => {
        // Autoplay might be blocked by browser, but we have muted attribute so it should work
        console.error('Error playing video:', err);
      });
    }
  }, [localStream]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      
      setLocalStream(stream);
      setCameraStream(stream); // Store camera stream for later
      setIsInitialized(true);
    } catch (err: any) {
      setError(err.message || 'Failed to access camera/microphone');
    }
  };

  const cleanup = async () => {
    if (localStream) {
      localStream.getTracks().forEach((track: any) => track.stop());
      setLocalStream(null);
    }
    if (cameraStream && cameraStream !== localStream) {
      cameraStream.getTracks().forEach((track: any) => track.stop());
      setCameraStream(null);
    }
    setIsInitialized(false);
    setIsScreenSharing(false);
  };

  const handleToggleAudio = useCallback(() => {
    if (localStream) {
      const newState = !isAudioEnabled;
      localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = newState;
      });
      setIsAudioEnabled(newState);
    }
  }, [localStream, isAudioEnabled]);

  const handleToggleVideo = useCallback(() => {
    if (localStream) {
      const newState = !isVideoEnabled;
      localStream.getVideoTracks().forEach((track: any) => {
        track.enabled = newState;
      });
      setIsVideoEnabled(newState);
    }
  }, [localStream, isVideoEnabled]);

  const handleSwitchCamera = useCallback(async () => {
    // Camera switching for web - toggle between user and environment
    if (localStream && Platform.OS === 'web') {
      try {
        const videoTrack = localStream.getVideoTracks()[0];
        const currentFacingMode = videoTrack.getSettings().facingMode;
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        
        videoTrack.stop();
        
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
          audio: true
        });
        
        setLocalStream(newStream);
      } catch (error) {
        console.error('Error switching camera:', error);
      }
    }
  }, [localStream]);

  const handleEndCall = useCallback(async () => {
    await cleanup();
    navigation.goBack();
  }, [navigation]);

  const handleToggleScreenShare = useCallback(async () => {
    if (Platform.OS !== 'web') {
      setError('Screen sharing is only available on web');
      return;
    }

    try {
      if (isScreenSharing) {
        // Stop screen sharing and switch back to camera
        if (localStream) {
          localStream.getTracks().forEach((track: any) => track.stop());
        }
        
        if (cameraStream) {
          setLocalStream(cameraStream);
          setIsScreenSharing(false);
        } else {
          // Camera stream was lost, reinitialize
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }, 
            audio: true 
          });
          setLocalStream(stream);
          setCameraStream(stream);
          setIsScreenSharing(false);
        }
      } else {
        // Start screen sharing
        const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: {
            cursor: 'always',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });

        // Handle when user stops sharing via browser UI
        screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          handleToggleScreenShare();
        });

        // Keep audio from camera
        if (cameraStream) {
          const audioTrack = cameraStream.getAudioTracks()[0];
          if (audioTrack) {
            screenStream.addTrack(audioTrack);
          }
        }

        setLocalStream(screenStream);
        setIsScreenSharing(true);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Screen sharing permission denied');
      } else {
        setError(err.message || 'Failed to share screen');
      }
    }
  }, [isScreenSharing, localStream, cameraStream]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render video element based on platform
  const renderLocalVideo = () => {
    if (!localStream) return null;

    if (Platform.OS === 'web') {
      // For web, use a stable ref to prevent flickering
      return (
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)', // Mirror effect
          }}
          autoPlay
          playsInline
          muted
        />
      );
    } else {
      // For native, use RTCView (will be available after proper setup)
      try {
        const { RTCView } = require('react-native-webrtc');
        return (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.video}
            objectFit="cover"
            mirror
          />
        );
      } catch (e) {
        return <Text style={{ color: 'white' }}>Video not available on this platform</Text>;
      }
    }
  };

  return (
    <View style={styles.container}>
      {!isInitialized ? (
        <View style={styles.waitingContainer}>
          <Avatar.Icon size={100} icon="video" />
          <Text variant="headlineSmall" style={styles.waitingText}>
            1-on-1 Video Call
          </Text>
          {error && (
            <Text variant="bodyMedium" style={styles.errorText}>
              {error}
            </Text>
          )}
          <Button 
            mode="contained" 
            onPress={initializeCall}
            style={styles.startButton}
            buttonColor="#4CAF50"
          >
            Start Video Call
          </Button>
        </View>
      ) : (
        <>
          {/* Local Video - Full Screen */}
          <View style={styles.videoContainer}>
            {renderLocalVideo()}
          </View>

          {/* Call Info */}
          <View style={styles.infoContainer}>
            <Text variant="titleLarge" style={styles.durationText}>
              {formatDuration(callDuration)}
            </Text>
            <Text variant="bodySmall" style={styles.statusText}>
              {isScreenSharing ? '📺 Sharing screen' : '🎥 Camera active'}
            </Text>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.controls}>
              <IconButton
                icon={isAudioEnabled ? 'microphone' : 'microphone-off'}
                size={32}
                iconColor="#fff"
                containerColor={isAudioEnabled ? '#666' : '#f44336'}
                onPress={handleToggleAudio}
              />
              <IconButton
                icon="phone-hangup"
                size={32}
                iconColor="#fff"
                containerColor="#f44336"
                onPress={handleEndCall}
                style={styles.endCallButton}
              />
              <IconButton
                icon={isVideoEnabled ? 'video' : 'video-off'}
                size={32}
                iconColor="#fff"
                containerColor={isVideoEnabled ? '#666' : '#f44336'}
                onPress={handleToggleVideo}
              />
            </View>
            <View style={styles.secondaryControls}>
              {Platform.OS === 'web' ? (
                <IconButton
                  icon={isScreenSharing ? 'monitor-off' : 'monitor-share'}
                  size={28}
                  iconColor="#fff"
                  containerColor={isScreenSharing ? '#4CAF50' : '#666'}
                  onPress={handleToggleScreenShare}
                />
              ) : (
                <IconButton
                  icon="camera-flip"
                  size={28}
                  iconColor="#fff"
                  containerColor="#666"
                  onPress={handleSwitchCamera}
                />
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  waitingText: {
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    color: '#ff6b6b',
    marginTop: 10,
    textAlign: 'center',
  },
  startButton: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusText: {
    color: '#aaa',
    marginTop: 2,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  endCallButton: {
    transform: [{ scale: 1.2 }],
  },
  secondaryControls: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
});

