import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import { Icon, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../store';
import { restoreAuth, logout } from '../store/slices/authSlice';
import { STORAGE_KEYS } from '../utils/constants';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens
import ConversationsScreen from '../screens/ConversationsScreen';
import NewConversationScreen from '../screens/NewConversationScreen';
import ChatScreen from '../screens/ChatScreen';
import CallScreen from '../screens/CallScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import VideoRoomScreen from '../screens/VideoRoomScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainNavigator() {
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      // Clear tokens
      await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      
      // Dispatch logout action
      dispatch(logout());
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const LogoutButton = () => (
    <IconButton
      icon="logout"
      iconColor="#fff"
      size={24}
      onPress={handleLogout}
    />
  );

  return (
    <Stack.Navigator 
      initialRouteName="CreateRoom"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <LogoutButton />,
      }}
    >
      <Stack.Screen 
        name="CreateRoom" 
        component={CreateRoomScreen}
        options={{ 
          title: 'Video Rooms',
        }}
      />
      <Stack.Screen 
        name="VideoRoom" 
        component={VideoRoomScreen}
        options={{ 
          title: 'Video Room',
        }}
      />
      <Stack.Screen 
        name="Call" 
        component={CallScreen}
        options={{ 
          title: 'Video Call',
        }}
      />
      <Stack.Screen 
        name="Conversations" 
        component={ConversationsScreen}
        options={{ title: 'Chats' }}
      />
      <Stack.Screen 
        name="NewConversation" 
        component={NewConversationScreen}
        options={{ title: 'New Conversation' }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={({ route }: any) => ({ 
          title: route.params?.conversation?.name || 'Chat'
        })}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const userDataStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (accessToken && refreshToken && userDataStr) {
        const userData = JSON.parse(userDataStr);
        dispatch(restoreAuth({
          user: userData,
          accessToken,
          refreshToken,
        }));
      }
    } catch (error) {
      console.error('Error restoring auth state:', error);
      dispatch(logout());
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // Or a loading screen
  }

  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
}

