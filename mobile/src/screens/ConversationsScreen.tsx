import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Avatar, FAB, Searchbar, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setConversations, setLoading } from '../store/slices/chatSlice';
import apiService from '../services/api';
import socketService from '../services/socket';
import { format } from 'date-fns';

export default function ConversationsScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const { conversations, isLoading } = useSelector((state: RootState) => state.chat);
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConversations();
    socketService.connect();
  }, []);

  const loadConversations = async () => {
    try {
      dispatch(setLoading(true));
      const data = await apiService.getConversations();
      dispatch(setConversations(data));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const renderConversation = ({ item }: any) => {
    const otherParticipant = item.participants.find((p: any) => p.id !== user?.id);
    const displayName = item.is_group ? item.name : otherParticipant?.full_name || 'Unknown';
    const lastMessageTime = item.last_message_at 
      ? format(new Date(item.last_message_at), 'HH:mm')
      : '';

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => navigation.navigate('Chat', { conversation: item })}
      >
        <Avatar.Text 
          size={50} 
          label={displayName.substring(0, 2).toUpperCase()} 
        />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text variant="titleMedium" style={styles.conversationName}>
              {displayName}
            </Text>
            <Text variant="bodySmall" style={styles.time}>
              {lastMessageTime}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.lastMessage} numberOfLines={1}>
            Last message preview...
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const otherParticipant = conv.participants.find((p: any) => p.id !== user?.id);
    const displayName = conv.is_group ? conv.name : otherParticipant?.full_name || '';
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (isLoading && conversations.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search conversations"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">No conversations yet</Text>
            <Text variant="bodySmall" style={styles.emptySubtext}>
              Start a new conversation to get started
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('NewConversation')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 16,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontWeight: 'bold',
  },
  time: {
    color: '#666',
  },
  lastMessage: {
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptySubtext: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});

