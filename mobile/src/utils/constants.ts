// API Configuration
// Import from @env which is loaded by react-native-dotenv
import { API_BASE_URL as ENV_API_URL, WS_URL as ENV_WS_URL } from '@env';

export const API_BASE_URL = ENV_API_URL || 'http://localhost:8000';
export const WS_URL = ENV_WS_URL || 'ws://localhost:8000';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@auth/access_token',
  REFRESH_TOKEN: '@auth/refresh_token',
  USER_DATA: '@auth/user_data',
};

// WebRTC Configuration
export const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
};

// Call Status
export const CALL_STATUS = {
  INITIATED: 'initiated',
  RINGING: 'ringing',
  ACTIVE: 'active',
  ENDED: 'ended',
  MISSED: 'missed',
  REJECTED: 'rejected',
};

