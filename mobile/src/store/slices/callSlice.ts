import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CallParticipant {
  id: number;
  user_id: number;
  stream?: any;
}

interface Call {
  id: number;
  conversation_id: number;
  initiator_id?: number;
  status: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
}

interface CallState {
  currentCall: Call | null;
  participants: CallParticipant[];
  localStream: any | null;
  remoteStreams: { [userId: number]: any };
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeakerEnabled: boolean;
  isRecording: boolean;
  recordingChunks: any[];
  error: string | null;
}

const initialState: CallState = {
  currentCall: null,
  participants: [],
  localStream: null,
  remoteStreams: {},
  isAudioEnabled: true,
  isVideoEnabled: true,
  isSpeakerEnabled: true,
  isRecording: false,
  recordingChunks: [],
  error: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    setCurrentCall: (state, action: PayloadAction<Call | null>) => {
      state.currentCall = action.payload;
    },
    setParticipants: (state, action: PayloadAction<CallParticipant[]>) => {
      state.participants = action.payload;
    },
    addParticipant: (state, action: PayloadAction<CallParticipant>) => {
      state.participants.push(action.payload);
    },
    removeParticipant: (state, action: PayloadAction<number>) => {
      state.participants = state.participants.filter(
        p => p.user_id !== action.payload
      );
      delete state.remoteStreams[action.payload];
    },
    setLocalStream: (state, action: PayloadAction<any>) => {
      state.localStream = action.payload;
    },
    setRemoteStream: (state, action: PayloadAction<{
      userId: number;
      stream: any;
    }>) => {
      state.remoteStreams[action.payload.userId] = action.payload.stream;
    },
    removeRemoteStream: (state, action: PayloadAction<number>) => {
      delete state.remoteStreams[action.payload];
    },
    toggleAudio: (state) => {
      state.isAudioEnabled = !state.isAudioEnabled;
    },
    toggleVideo: (state) => {
      state.isVideoEnabled = !state.isVideoEnabled;
    },
    toggleSpeaker: (state) => {
      state.isSpeakerEnabled = !state.isSpeakerEnabled;
    },
    setRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
      if (!action.payload) {
        state.recordingChunks = [];
      }
    },
    addRecordingChunk: (state, action: PayloadAction<any>) => {
      state.recordingChunks.push(action.payload);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    endCall: (state) => {
      state.currentCall = null;
      state.participants = [];
      state.localStream = null;
      state.remoteStreams = {};
      state.isRecording = false;
      state.recordingChunks = [];
    },
  },
});

export const {
  setCurrentCall,
  setParticipants,
  addParticipant,
  removeParticipant,
  setLocalStream,
  setRemoteStream,
  removeRemoteStream,
  toggleAudio,
  toggleVideo,
  toggleSpeaker,
  setRecording,
  addRecordingChunk,
  setError,
  endCall,
} = callSlice.actions;

export default callSlice.reducer;

