import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';

import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/utils/theme';

const linking = {
  prefixes: [
    Linking.createURL('/'),
    'chatvideoapp://',
    'https://d3vjjrlo0km8am.cloudfront.net',
    'http://localhost:8081',
  ],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      CreateRoom: 'create-room',
      VideoRoom: 'room/:roomId',
      Call: 'call',
      Conversations: 'conversations',
      NewConversation: 'new-conversation',
      Chat: 'chat/:id',
    },
  },
};

export default function App() {
  return (
    <Provider store={store}>
      <PaperProvider theme={theme}>
        <NavigationContainer linking={linking}>
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </PaperProvider>
    </Provider>
  );
}

