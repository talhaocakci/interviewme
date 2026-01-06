import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: number;
  conversation_id: number;
  sender_id?: number;
  content?: string;
  message_type: string;
  media_url?: string;
  reply_to_id?: number;
  created_at: string;
  is_deleted: boolean;
}

interface Conversation {
  id: number;
  name?: string;
  is_group: boolean;
  avatar_url?: string;
  created_at: string;
  last_message_at?: string;
  participants: any[];
}

interface ChatState {
  conversations: Conversation[];
  messages: { [conversationId: number]: Message[] };
  currentConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  typingUsers: { [conversationId: number]: number[] };
}

const initialState: ChatState = {
  conversations: [],
  messages: {},
  currentConversation: null,
  isLoading: false,
  error: null,
  typingUsers: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      state.conversations.unshift(action.payload);
    },
    setCurrentConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.currentConversation = action.payload;
    },
    setMessages: (state, action: PayloadAction<{
      conversationId: number;
      messages: Message[];
    }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      const { conversation_id } = action.payload;
      if (!state.messages[conversation_id]) {
        state.messages[conversation_id] = [];
      }
      state.messages[conversation_id].push(action.payload);
      
      // Update conversation last_message_at
      const conversation = state.conversations.find(c => c.id === conversation_id);
      if (conversation) {
        conversation.last_message_at = action.payload.created_at;
      }
    },
    prependMessages: (state, action: PayloadAction<{
      conversationId: number;
      messages: Message[];
    }>) => {
      const { conversationId, messages } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId] = [
        ...messages,
        ...state.messages[conversationId]
      ];
    },
    setTypingUsers: (state, action: PayloadAction<{
      conversationId: number;
      userId: number;
      isTyping: boolean;
    }>) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      
      const users = state.typingUsers[conversationId];
      if (isTyping && !users.includes(userId)) {
        users.push(userId);
      } else if (!isTyping) {
        state.typingUsers[conversationId] = users.filter(id => id !== userId);
      }
    },
    clearChat: (state) => {
      state.conversations = [];
      state.messages = {};
      state.currentConversation = null;
      state.typingUsers = {};
    },
  },
});

export const {
  setLoading,
  setError,
  setConversations,
  addConversation,
  setCurrentConversation,
  setMessages,
  addMessage,
  prependMessages,
  setTypingUsers,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;

