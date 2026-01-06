import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, IconButton, Text, Avatar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setMessages, addMessage, setCurrentConversation } from '../store/slices/chatSlice';
import apiService from '../services/api';
import socketService from '../services/socket';
import { format } from 'date-fns';

export default function ChatScreen({ route, navigation }: any) {
  const { conversation } = route.params;
  const dispatch = useDispatch();
  const { messages, typingUsers } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  const conversationMessages = messages[conversation.id] || [];

  useEffect(() => {
    dispatch(setCurrentConversation(conversation));
    loadMessages();
    socketService.joinConversation(conversation.id);

    return () => {
      dispatch(setCurrentConversation(null));
    };
  }, [conversation.id]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await apiService.getMessages(conversation.id);
      dispatch(setMessages({ conversationId: conversation.id, messages: data }));
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const tempMessage = messageText;
    setMessageText('');

    try {
      socketService.sendMessage({
        conversation_id: conversation.id,
        content: tempMessage,
        message_type: 'text',
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(tempMessage);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    socketService.sendTyping(conversation.id, isTyping);
  };

  const renderMessage = ({ item }: any) => {
    const isOwn = item.sender_id === user?.id;
    const time = format(new Date(item.created_at), 'HH:mm');

    return (
      <View style={[styles.messageContainer, isOwn && styles.ownMessageContainer]}>
        {!isOwn && (
          <Avatar.Text size={32} label="U" style={styles.avatar} />
        )}
        <View style={[styles.messageBubble, isOwn && styles.ownMessageBubble]}>
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
            {time}
          </Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    const typingUserIds = typingUsers[conversation.id] || [];
    if (typingUserIds.length === 0) return null;

    return (
      <View style={styles.typingIndicator}>
        <Text variant="bodySmall" style={styles.typingText}>
          Someone is typing...
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={conversationMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        inverted
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {renderTypingIndicator()}

      <View style={styles.inputContainer}>
        <IconButton
          icon="camera"
          size={24}
          onPress={() => {/* TODO: Image picker */}}
        />
        <TextInput
          value={messageText}
          onChangeText={(text) => {
            setMessageText(text);
            handleTyping(text.length > 0);
          }}
          placeholder="Type a message..."
          style={styles.input}
          mode="outlined"
          dense
          multiline
          maxLength={1000}
        />
        <IconButton
          icon="send"
          size={24}
          onPress={handleSendMessage}
          disabled={!messageText.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  avatar: {
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  ownMessageBubble: {
    backgroundColor: '#6200ee',
    marginLeft: 'auto',
  },
  messageText: {
    fontSize: 16,
  },
  ownMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: '#fff',
    opacity: 0.7,
  },
  typingIndicator: {
    padding: 8,
    paddingLeft: 16,
  },
  typingText: {
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    maxHeight: 100,
  },
});

