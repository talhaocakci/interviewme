import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Clipboard, Share } from 'react-native';
import { Text, TextInput, Button, Card, Snackbar, IconButton, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import apiService from '../services/api';

export default function CreateRoomScreen() {
  const navigation = useNavigation();
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState<{id: string, name: string, url: string} | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiService.createRoom(roomName, 2);
      const { room_id, name } = response;

      // Generate shareable URL
      const roomUrl = generateRoomUrl(room_id);
      
      setCreatedRoom({
        id: room_id,
        name: name,
        url: roomUrl
      });

      // Don't auto-navigate, show the link first
    } catch (err: any) {
      console.error('Error creating room:', err);
      setError(err.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const generateRoomUrl = (roomId: string) => {
    if (Platform.OS === 'web') {
      // For web, use the current domain
      if (typeof window !== 'undefined') {
        return `${window.location.origin}/room/${roomId}`;
      }
    }
    // Fallback: use CloudFront URL
    return `https://d3vjjrlo0km8am.cloudfront.net/room/${roomId}`;
  };

  const copyRoomLink = () => {
    if (createdRoom) {
      if (Platform.OS === 'web') {
        navigator.clipboard.writeText(createdRoom.url);
      } else {
        Clipboard.setString(createdRoom.url);
      }
      setSnackbarMessage('Link copied to clipboard!');
      setSnackbarVisible(true);
    }
  };

  const shareRoomLink = async () => {
    if (createdRoom) {
      try {
        await Share.share({
          message: `Join my video call: ${createdRoom.name}\n\n${createdRoom.url}`,
          url: createdRoom.url,
          title: `Join ${createdRoom.name}`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const joinRoom = () => {
    if (createdRoom) {
      navigation.navigate('VideoRoom' as never, { roomId: createdRoom.id } as never);
    }
  };

  const createAnother = () => {
    setCreatedRoom(null);
    setRoomName('');
    setError('');
  };

  return (
    <ScrollView style={styles.container}>
      {!createdRoom ? (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="headlineMedium" style={styles.title}>
                Create Video Room
              </Text>
              
              <Text variant="bodyMedium" style={styles.description}>
                Create a room and share the link with someone to start a video call
              </Text>

              <TextInput
                label="Room Name"
                value={roomName}
                onChangeText={setRoomName}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Team Meeting, Interview"
              />

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              <Button
                mode="contained"
                onPress={handleCreateRoom}
                loading={loading}
                disabled={loading}
                style={styles.button}
              >
                Create Room
              </Button>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.subtitle}>
                How it works
              </Text>
              
              <View style={styles.step}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Create a room with a name</Text>
              </View>
              
              <View style={styles.step}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Share the room link</Text>
              </View>
              
              <View style={styles.step}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Wait for others to join</Text>
              </View>
              
              <View style={styles.step}>
                <Text style={styles.stepNumber}>4</Text>
                <Text style={styles.stepText}>Start your video call!</Text>
              </View>
            </Card.Content>
          </Card>
        </>
      ) : (
        <>
          <Card style={styles.successCard}>
            <Card.Content>
              <Text variant="headlineMedium" style={styles.successTitle}>
                🎉 Room Created!
              </Text>
              
              <Text variant="titleLarge" style={styles.roomName}>
                {createdRoom.name}
              </Text>
              
              <Divider style={styles.divider} />
              
              <Text variant="labelLarge" style={styles.label}>
                Room ID
              </Text>
              <Text variant="bodyLarge" style={styles.roomId}>
                {createdRoom.id}
              </Text>
              
              <Text variant="labelLarge" style={[styles.label, styles.labelTop]}>
                Shareable Link
              </Text>
              <View style={styles.urlContainer}>
                <Text variant="bodyMedium" style={styles.url} numberOfLines={2}>
                  {createdRoom.url}
                </Text>
                <IconButton
                  icon="content-copy"
                  mode="contained"
                  onPress={copyRoomLink}
                  style={styles.copyButton}
                />
              </View>
              
              <Text variant="bodySmall" style={styles.hint}>
                Share this link with someone to invite them to the video call
              </Text>

              <View style={styles.actionButtons}>
                <Button
                  mode="outlined"
                  onPress={copyRoomLink}
                  style={styles.actionButton}
                  icon="content-copy"
                >
                  Copy Link
                </Button>
                <Button
                  mode="outlined"
                  onPress={shareRoomLink}
                  style={styles.actionButton}
                  icon="share-variant"
                >
                  Share
                </Button>
              </View>
              
              <Button
                mode="contained"
                onPress={joinRoom}
                style={styles.button}
                icon="video"
              >
                Join Room Now
              </Button>
              
              <Button
                mode="text"
                onPress={createAnother}
                style={styles.button}
              >
                Create Another Room
              </Button>
            </Card.Content>
          </Card>
        </>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  successCard: {
    margin: 16,
    elevation: 4,
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  successTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4caf50',
  },
  subtitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  description: {
    marginBottom: 24,
    color: '#666',
  },
  roomName: {
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  label: {
    marginBottom: 4,
    color: '#666',
  },
  labelTop: {
    marginTop: 16,
  },
  roomId: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    paddingLeft: 12,
    marginBottom: 8,
  },
  url: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  copyButton: {
    margin: 0,
  },
  hint: {
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    color: '#f44336',
    marginBottom: 8,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6200ee',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
  },
});

