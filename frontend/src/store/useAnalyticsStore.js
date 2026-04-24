import { create } from 'zustand';
import api from '../lib/api';

export const useAnalyticsStore = create((set) => ({
  insights: null,
  topMatches: [],
  loading: false,
  topMatchesLoading: false,
  error: null,

  fetchInsights: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/analytics/insights');
      console.log('[ANALYTICS] Received insights:', data);
      set({ insights: data, loading: false });
      return data;
    } catch (err) {
      console.error('[ANALYTICS] fetchInsights error:', err.message);
      set({ error: err.response?.data?.message || 'Failed to load insights', loading: false });
    }
  },

  fetchTopMatches: async () => {
    set({ topMatchesLoading: true });
    try {
      const { data } = await api.get('/analytics/top-matches');
      console.log('[ANALYTICS] Top matches:', data.length);
      set({ topMatches: data, topMatchesLoading: false });
      return data;
    } catch (err) {
      console.error('[ANALYTICS] fetchTopMatches error:', err.message);
      set({ topMatchesLoading: false });
      return [];
    }
  },

  fetchMatchScore: async (targetId) => {
    try {
      const { data } = await api.get(`/analytics/match-score/${targetId}`);
      return data;
    } catch (err) {
      console.error('[ANALYTICS] fetchMatchScore error:', err.message);
      return null;
    }
  }
}));
