import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../utils/constants';

interface User {
  id: number;
  username?: string;
  email?: string;
  phone_number?: string;
  full_name?: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setCredentials: (state, action: PayloadAction<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
      
      // Save to AsyncStorage
      AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, action.payload.accessToken);
      AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, action.payload.refreshToken);
      AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(action.payload.user));
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(action.payload));
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      
      // Clear AsyncStorage
      AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    },
    restoreAuth: (state, action: PayloadAction<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
  },
});

export const {
  setLoading,
  setError,
  setCredentials,
  updateUser,
  logout,
  restoreAuth,
} = authSlice.actions;

export default authSlice.reducer;

