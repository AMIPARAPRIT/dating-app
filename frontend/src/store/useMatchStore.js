import { create } from 'zustand';
import api from '../lib/api';

const DEFAULT_FILTERS = {
  ageMin: 18, ageMax: 50,
  heightMin: '', heightMax: '',
  distance: 50,
  gender: '',
  interests: [],
  lifestyle_smoking: '',
  lifestyle_drinking: '',
  lifestyle_workout: '',
  lifestyle_schedule: '',
  intent: ''
};

// Persist filters to localStorage
const loadSavedFilters = () => {
  try {
    const saved = localStorage.getItem('spark_filters');
    return saved ? { ...DEFAULT_FILTERS, ...JSON.parse(saved) } : DEFAULT_FILTERS;
  } catch { return DEFAULT_FILTERS; }
};

const countActiveFilters = (filters) => {
  return Object.entries(filters).filter(([k, v]) => {
    if (k === 'ageMin') return v !== 18;
    if (k === 'ageMax') return v !== 50;
    if (k === 'distance') return v !== 50;
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== null && v !== undefined;
  }).length;
};

const buildFilterParams = (filters) => {
  const params = new URLSearchParams();
  // Only send age if non-default
  if (filters.ageMin && filters.ageMin !== 18) params.set('ageMin', filters.ageMin);
  if (filters.ageMax && filters.ageMax !== 50) params.set('ageMax', filters.ageMax);
  // Always send age bounds so backend can filter correctly
  params.set('ageMin', filters.ageMin ?? 18);
  params.set('ageMax', filters.ageMax ?? 50);
  if (filters.heightMin) params.set('heightMin', filters.heightMin);
  if (filters.heightMax) params.set('heightMax', filters.heightMax);
  if (filters.distance && filters.distance !== 50) params.set('distance', filters.distance);
  if (filters.gender) params.set('gender', filters.gender);
  if (filters.interests?.length) params.set('interests', filters.interests.join(','));
  if (filters.lifestyle_smoking) params.set('lifestyle_smoking', filters.lifestyle_smoking);
  if (filters.lifestyle_drinking) params.set('lifestyle_drinking', filters.lifestyle_drinking);
  if (filters.lifestyle_workout) params.set('lifestyle_workout', filters.lifestyle_workout);
  if (filters.lifestyle_schedule) params.set('lifestyle_schedule', filters.lifestyle_schedule);
  if (filters.intent) params.set('intent', filters.intent);
  return params.toString();
};

export const useMatchStore = create((set, get) => ({
  feed: [],
  matches: [],
  liked: [],
  likedMe: [],
  currentIndex: 0,
  newMatch: null,
  loading: false,
  filters: loadSavedFilters(),
  activeFilterCount: countActiveFilters(loadSavedFilters()),
  hasMore: false,
  page: 0,
  useFilteredFeed: false,

  setFilters: (filters) => {
    const merged = { ...get().filters, ...filters };
    const count = countActiveFilters(merged);
    localStorage.setItem('spark_filters', JSON.stringify(merged));
    set({ filters: merged, activeFilterCount: count });
  },

  resetFilters: () => {
    localStorage.removeItem('spark_filters');
    set({ filters: DEFAULT_FILTERS, activeFilterCount: 0, useFilteredFeed: false, page: 0 });
    // Re-fetch regular feed after reset
    get().fetchFeed();
  },

  fetchFeed: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/matches/feed');
      set({ feed: data, currentIndex: 0, loading: false, useFilteredFeed: false });
    } catch (err) {
      console.error('[STORE] fetchFeed error:', err.message);
      set({ loading: false });
    }
  },

  fetchFilteredFeed: async (resetPage = true, overrideFilters = null) => {
    const { filters: storeFilters, page, feed } = get();
    const filters = overrideFilters || storeFilters;
    const newPage = resetPage ? 0 : page;
    set({ loading: true });
    try {
      const qs = buildFilterParams(filters);
      const { data } = await api.get(`/users/filter?${qs}&page=${newPage}&limit=20`);
      set({
        feed: resetPage ? (data.results || []) : [...feed, ...(data.results || [])],
        currentIndex: resetPage ? 0 : get().currentIndex,
        loading: false,
        hasMore: data.hasMore,
        page: newPage + 1,
        useFilteredFeed: true
      });
      return data;
    } catch (err) {
      console.error('[STORE] fetchFilteredFeed error:', err.message);
      set({ loading: false });
    }
  },

  applyFilters: async (newFilters) => {
    // Merge + persist first
    const merged = { ...get().filters, ...newFilters };
    const count = countActiveFilters(merged);
    localStorage.setItem('spark_filters', JSON.stringify(merged));
    set({ filters: merged, activeFilterCount: count });
    // Pass merged filters directly to avoid race condition
    return get().fetchFilteredFeed(true, merged);
  },

  fetchMatches: async () => {
    const { data } = await api.get('/matches');
    set({ matches: data });
  },

  fetchLikes: async () => {
    try {
      const [liked, likedMe] = await Promise.all([
        api.get('/matches/likes'),
        api.get('/matches/liked-me')
      ]);
      set({ liked: liked.data, likedMe: likedMe.data });
    } catch (err) {
      console.error('[STORE] fetchLikes error:', err.message);
    }
  },

  likeUser: async (targetId, advanceFeed = true) => {
    // Only advance the swipe card if liking the current feed card
    if (advanceFeed) set(s => ({ currentIndex: s.currentIndex + 1 }));
    try {
      console.log('[STORE] likeUser:', targetId);
      const { data } = await api.post(`/matches/like/${targetId}`);
      if (data.matched) set({ newMatch: data.match });
      return data;
    } catch (err) {
      console.error('[STORE] likeUser error:', err.message);
      return { matched: false };
    }
  },

  superlikeUser: async (targetId, advanceFeed = true) => {
    if (advanceFeed) set(s => ({ currentIndex: s.currentIndex + 1 }));
    try {
      console.log('[STORE] superlikeUser:', targetId);
      const { data } = await api.post(`/matches/superlike/${targetId}`);
      if (data.matched) set({ newMatch: data.match });
      return data;
    } catch (err) {
      console.error('[STORE] superlikeUser error:', err.message);
      return { matched: false };
    }
  },

  passUser: async (targetId, advanceFeed = true) => {
    if (advanceFeed) set(s => ({ currentIndex: s.currentIndex + 1 }));
    api.post(`/matches/pass/${targetId}`).catch(err =>
      console.error('[STORE] passUser error:', err.message)
    );
  },

  removeMatch: async (matchId) => {
    try {
      await api.delete(`/matches/${matchId}`);
      set(s => ({ matches: s.matches.filter(m => m._id !== matchId) }));
      console.log('[STORE] Match removed:', matchId);
    } catch (err) {
      console.error('[STORE] removeMatch error:', err.message);
      throw err;
    }
  },

  removeLike: async (userId) => {
    // Optimistically remove from liked list immediately
    set(s => ({ liked: s.liked.filter(u => u._id !== userId) }));
    try {
      await api.delete(`/matches/like/${userId}`);
    } catch (err) {
      console.error('[STORE] removeLike error:', err.message);
      // Re-fetch to restore state on failure
      get().fetchLikes();
      throw err;
    }
  },

  clearNewMatch: () => set({ newMatch: null })
}));
