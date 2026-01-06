import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          try {
            await this.refreshToken();
            // Retry original request
            if (error.config) {
              return this.client(error.config);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            await this.logout();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: {
    email?: string;
    phone_number?: string;
    password: string;
    full_name?: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(data: { email?: string; phone_number?: string; password: string }) {
    const response = await this.client.post('/auth/login', data);
    return response.data;
  }

  async sendPhoneOTP(phone_number: string) {
    const response = await this.client.post('/auth/phone/send-otp', { phone_number });
    return response.data;
  }

  async verifyPhoneOTP(phone_number: string, otp_code: string) {
    const response = await this.client.post('/auth/phone/verify-otp', {
      phone_number,
      otp_code,
    });
    return response.data;
  }

  async googleAuth(code: string) {
    const response = await this.client.post('/auth/google', { code });
    return response.data;
  }

  async facebookAuth(code: string) {
    const response = await this.client.post('/auth/facebook', { code });
    return response.data;
  }

  async appleAuth(code: string) {
    const response = await this.client.post('/auth/apple', { code });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async refreshToken() {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    const response = await this.client.post('/auth/refresh', { refresh_token: refreshToken });
    const { access_token } = response.data;
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    return access_token;
  }

  async logout() {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
  }

  // User endpoints
  async getUser(userId: number) {
    const response = await this.client.get(`/users/${userId}`);
    return response.data;
  }

  async searchUsers(query: string) {
    const response = await this.client.get('/users', { params: { q: query } });
    return response.data;
  }

  // Conversation endpoints
  async getConversations() {
    const response = await this.client.get('/conversations');
    return response.data;
  }

  async getConversation(conversationId: number) {
    const response = await this.client.get(`/conversations/${conversationId}`);
    return response.data;
  }

  async createConversation(data: {
    participant_ids: number[];
    name?: string;
    is_group?: boolean;
  }) {
    const response = await this.client.post('/conversations', data);
    return response.data;
  }

  async getMessages(conversationId: number, limit = 50, beforeId?: number) {
    const response = await this.client.get(`/conversations/${conversationId}/messages`, {
      params: { limit, before_id: beforeId },
    });
    return response.data;
  }

  async sendMessage(conversationId: number, data: {
    content?: string;
    message_type?: string;
    media_url?: string;
    reply_to_id?: number;
  }) {
    const response = await this.client.post(`/conversations/${conversationId}/messages`, data);
    return response.data;
  }

  // Call endpoints
  async initiateCall(conversationId: number) {
    const response = await this.client.post('/calls/initiate', { conversation_id: conversationId });
    return response.data;
  }

  async acceptCall(callId: number) {
    const response = await this.client.post(`/calls/${callId}/accept`);
    return response.data;
  }

  async rejectCall(callId: number) {
    const response = await this.client.post(`/calls/${callId}/reject`);
    return response.data;
  }

  async endCall(callId: number, duration?: number) {
    const response = await this.client.post(`/calls/${callId}/end`, { duration });
    return response.data;
  }

  async uploadRecording(callId: number, data: {
    s3_key: string;
    s3_bucket: string;
    file_size?: number;
    duration?: number;
  }) {
    const response = await this.client.post(`/calls/${callId}/recording`, data);
    return response.data;
  }

  async getCall(callId: number) {
    const response = await this.client.get(`/calls/${callId}`);
    return response.data;
  }

  async getRecordings(callId: number) {
    const response = await this.client.get(`/calls/${callId}/recordings`);
    return response.data;
  }

  // File upload helper
  async uploadFile(file: any, uploadUrl: string) {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });
    return response.ok;
  }

  // S3 presigned URLs
  async getPresignedUploadUrl(filename: string, contentType: string) {
    const response = await this.client.post('/upload/presigned-url', {
      filename,
      content_type: contentType,
    });
    return response.data;
  }

  async getPresignedDownloadUrl(fileKey: string) {
    const response = await this.client.post('/upload/download-url', {
      file_key: fileKey,
    });
    return response.data;
  }
}

export default new ApiService();

