import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Divider } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setCredentials, setError, setLoading } from '../store/slices/authSlice';
import apiService from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLocalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }

    try {
      setLocalLoading(true);
      setErrorMsg('');
      dispatch(setLoading(true));
      
      console.log('Attempting login...');
      const response = await apiService.login({ email, password });
      console.log('Login response:', response);
      
      // Store tokens first
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);
      
      console.log('Getting user info...');
      const user = await apiService.getCurrentUser();
      console.log('User info:', user);
      
      dispatch(setCredentials({
        user,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      }));
      
      console.log('Login successful!');
      // Navigation will happen automatically via AppNavigator checking isAuthenticated
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Login failed';
      setErrorMsg(errorMessage);
      dispatch(setError(errorMessage));
    } finally {
      setLocalLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text variant="headlineLarge" style={styles.title}>
            Welcome Back
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Sign in to continue
          </Text>

          {errorMsg ? (
            <Text style={styles.error}>{errorMsg}</Text>
          ) : null}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            mode="outlined"
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Sign In
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            style={styles.linkButton}
          >
            Don't have an account? Sign Up
          </Button>

          <Divider style={styles.divider} />

          <Text variant="bodySmall" style={styles.orText}>
            Or continue with
          </Text>

          <Button
            mode="outlined"
            onPress={() => navigation.navigate('PhoneLogin')}
            style={styles.button}
            icon="phone"
          >
            Phone Number
          </Button>

          <Button
            mode="outlined"
            onPress={() => {/* TODO: Google Sign In */}}
            style={styles.button}
            icon="google"
          >
            Google
          </Button>

          <Button
            mode="outlined"
            onPress={() => {/* TODO: Facebook Sign In */}}
            style={styles.button}
            icon="facebook"
          >
            Facebook
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  linkButton: {
    marginTop: 16,
  },
  divider: {
    marginVertical: 24,
  },
  orText: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  error: {
    color: '#d32f2f',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 4,
  },
});

