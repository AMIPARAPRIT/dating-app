import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      set({ token: data.token, user: data.user, loading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Login failed', loading: false });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('token', data.token);
      set({ token: data.token, user: data.user, loading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Registration failed', loading: false });
      throw err;
    }
  },

  googleAuth: async (credential) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/google', { credential });
      localStorage.setItem('token', data.token);
      set({ token: data.token, user: data.user, loading: false });
      return data;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Google auth failed', loading: false });
      throw err;
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
      return data;
    } catch {
      // Token invalid or expired — clear session
      localStorage.removeItem('token');
      set({ user: null, token: null });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  updateProfile: async (updates) => {
    const { data } = await api.put('/users/profile', updates);
    set({ user: data });
    return data;
  },

  updateProfileFull: async (updates) => {
    console.log('[AUTH STORE] updateProfileFull:', updates);
    const { data } = await api.put('/user/update', updates);
    set({ user: data.user });
    return data.user;
  },

  saveOnboarding: async (updates) => {
    console.log('--- ONBOARDING LOG: SENDING PAYLOAD ---', updates);
    try {
      const { data } = await api.post('/user/onboarding', updates);
      set({ user: data.user });
      console.log('--- ONBOARDING LOG: SERVER RESPONSE ---', data);
      return data.user;
    } catch (err) {
      console.error('--- ONBOARDING LOG: API ERROR ---', err.response?.data || err.message);
      throw err;
    }
  }
}));
