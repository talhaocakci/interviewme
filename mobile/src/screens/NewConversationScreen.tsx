import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Avatar, Searchbar, ActivityIndicator, Button } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import apiService from '../services/api';

export default function NewConversationScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const { user } = useSelector((state: RootState) => state.auth);

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const results = await apiService.searchUsers(query);
      // Filter out current user
      setUsers(results.filter((u: any) => u.id !== user?.id));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (selectedUser: any) => {
    const isSelected = selectedUsers.find(u => u.id === selectedUser.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== selectedUser.id));
    } else {
      setSelectedUsers([...selectedUsers, selectedUser]);
    }
  };

  const createConversation = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setLoading(true);
      const conversation = await apiService.createConversation({
        participant_ids: selectedUsers.map(u => u.id),
        is_group: selectedUsers.length > 1,
        name: selectedUsers.length > 1 
          ? selectedUsers.map(u => u.full_name || u.email).join(', ')
          : undefined,
      });

      // Navigate to the new chat
      navigation.replace('Chat', { conversation });
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }: any) => {
    const isSelected = selectedUsers.find(u => u.id === item.id);
    const displayName = item.full_name || item.email || 'User';

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item)}
      >
        <Avatar.Text 
          size={50} 
          label={displayName.substring(0, 2).toUpperCase()} 
        />
        <View style={styles.userContent}>
          <Text variant="titleMedium">{displayName}</Text>
          {item.email && (
            <Text variant="bodySmall" style={styles.userEmail}>
              {item.email}
            </Text>
          )}
        </View>
        {isSelected && (
          <Avatar.Icon size={30} icon="check" style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search users by name or email"
        onChangeText={(query) => {
          setSearchQuery(query);
          searchUsers(query);
        }}
        value={searchQuery}
        style={styles.searchBar}
      />

      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text variant="titleSmall" style={styles.selectedTitle}>
            Selected ({selectedUsers.length})
          </Text>
          <Button
            mode="contained"
            onPress={createConversation}
            loading={loading}
            disabled={loading}
            style={styles.createButton}
          >
            Start Conversation
          </Button>
        </View>
      )}

      {loading && users.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            searchQuery.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge">No users found</Text>
                <Text variant="bodySmall" style={styles.emptySubtext}>
                  Try searching with a different name or email
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge">Search for users</Text>
                <Text variant="bodySmall" style={styles.emptySubtext}>
                  Enter at least 2 characters to search
                </Text>
              </View>
            )
          }
        />
      )}
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
  selectedContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  createButton: {
    marginTop: 8,
  },
  userItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  userItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  userContent: {
    flex: 1,
    marginLeft: 16,
  },
  userEmail: {
    color: '#666',
    marginTop: 4,
  },
  checkIcon: {
    backgroundColor: '#4caf50',
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
});

