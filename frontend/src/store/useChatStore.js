import { create } from 'zustand';
import api from '../lib/api';
import { io } from 'socket.io-client';

let socket = null;

// Helper — add a message to a specific chat in state
const addMessage = (state, matchId, msg) => ({
  chats: {
    ...state.chats,
    [matchId]: {
      ...state.chats[matchId],
      messages: [...(state.chats[matchId]?.messages || []), msg]
    }
  }
});

export const useChatStore = create((set, get) => ({
  chats: {},
  conversations: [],
  totalUnread: 0,
  activeMatchId: null,
  typingUsers: {},
  onlineUsers: new Set(),
  starters: [],

  initSocket: (token) => {
    if (socket?.connected) return;

    socket = io(import.meta.env.VITE_API_URL || '/', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected:', socket.id);
      // Re-join active chat room after reconnect
      const { activeMatchId } = get();
      if (activeMatchId) socket.emit('chat:join', activeMatchId);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
    });

    socket.on('chat:message', ({ matchId, ...msg }) => {
      // Deduplicate — skip if we already have this message (optimistic)
      const existing = get().chats[matchId]?.messages || [];
      const isDupe = existing.some(
        m => m._tempId && m._tempId === msg._tempId
      );
      if (isDupe) {
        // Replace temp message with confirmed one
        set(s => ({
          chats: {
            ...s.chats,
            [matchId]: {
              ...s.chats[matchId],
              messages: s.chats[matchId].messages.map(m =>
                m._tempId === msg._tempId ? { ...msg, _confirmed: true } : m
              )
            }
          }
        }));
      } else {
        set(s => addMessage(s, matchId, msg));
      }
      // Refresh conversation list for unread badge
      get().fetchConversations();
    });

    socket.on('chat:typing', ({ userId, isTyping }) => {
      set(s => ({ typingUsers: { ...s.typingUsers, [userId]: isTyping } }));
    });

    socket.on('user:online', ({ userId }) => {
      set(s => { const u = new Set(s.onlineUsers); u.add(userId); return { onlineUsers: u }; });
    });

    socket.on('user:offline', ({ userId }) => {
      set(s => { const u = new Set(s.onlineUsers); u.delete(userId); return { onlineUsers: u }; });
    });

    socket.on('chat:error', ({ message }) => {
      console.error('[SOCKET] Chat error:', message);
    });
  },

  joinChat: (matchId) => {
    socket?.emit('chat:join', matchId);
    set({ activeMatchId: matchId });
  },

  // Send message — optimistic update + socket + REST fallback
  sendMessage: async (matchId, content, type = 'text', mediaUrl = null) => {
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const userId = (() => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id;
      } catch { return null; }
    })();

    // 1. Optimistic update — show message immediately
    const optimisticMsg = {
      _tempId: tempId,
      sender: userId,
      content,
      type,
      mediaUrl,
      createdAt: new Date().toISOString(),
      _pending: true
    };
    set(s => addMessage(s, matchId, optimisticMsg));

    // 2. Try socket first
    if (socket?.connected) {
      socket.emit('chat:message', { matchId, content, type, mediaUrl, _tempId: tempId });
      return;
    }

    // 3. REST fallback if socket not connected
    try {
      console.log('[CHAT] Socket not connected — using REST fallback');
      const { data } = await api.post(`/chat/${matchId}/message`, { content, type, mediaUrl });
      // Replace optimistic message with confirmed one
      set(s => ({
        chats: {
          ...s.chats,
          [matchId]: {
            ...s.chats[matchId],
            messages: s.chats[matchId].messages.map(m =>
              m._tempId === tempId ? { ...data, _confirmed: true } : m
            )
          }
        }
      }));
      // Poll for AI reply after delay (REST path — socket may be down)
      setTimeout(() => get().fetchChat(matchId), 2500);
    } catch (err) {
      console.error('[CHAT] REST fallback failed:', err.message);
      // Mark message as failed
      set(s => ({
        chats: {
          ...s.chats,
          [matchId]: {
            ...s.chats[matchId],
            messages: s.chats[matchId].messages.map(m =>
              m._tempId === tempId ? { ...m, _failed: true, _pending: false } : m
            )
          }
        }
      }));
    }
  },

  sendTyping: (matchId, isTyping) => {
    socket?.emit('chat:typing', { matchId, isTyping });
  },

  fetchChat: async (matchId) => {
    try {
      const { data } = await api.get(`/chat/${matchId}`);
      set(s => {
        const existing = s.chats[matchId];
        if (!existing) return { chats: { ...s.chats, [matchId]: data } };

        // Merge: keep pending/failed optimistic messages, add any new confirmed ones
        const confirmedIds = new Set(data.messages.map(m => m._id?.toString()).filter(Boolean));
        const pendingMsgs = (existing.messages || []).filter(m => m._pending || m._failed);
        const newPending = pendingMsgs.filter(m => !confirmedIds.has(m._id?.toString()));

        return {
          chats: {
            ...s.chats,
            [matchId]: {
              ...data,
              messages: [...data.messages, ...newPending]
            }
          }
        };
      });
      return data;
    } catch (err) {
      console.error('[CHAT] fetchChat error:', err.message);
      const empty = { matchId, participants: [], messages: [] };
      set(s => ({ chats: { ...s.chats, [matchId]: empty } }));
      return empty;
    }
  },

  fetchStarters: async (matchId) => {
    try {
      const { data } = await api.get(`/chat/${matchId}/starters`);
      set({ starters: data.starters || [] });
    } catch {
      set({ starters: [
        "What's your favorite thing to do on weekends?",
        "If you could travel anywhere, where would you go?",
        "What's something you're really passionate about?"
      ]});
    }
  },

  fetchConversations: async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      const total = data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      set({ conversations: data, totalUnread: total });
      return data;
    } catch (err) {
      console.error('[CHAT] fetchConversations error:', err.message);
      return [];
    }
  },

  disconnectSocket: () => {
    socket?.disconnect();
    socket = null;
    set({ activeMatchId: null, typingUsers: {}, onlineUsers: new Set() });
  }
}));
