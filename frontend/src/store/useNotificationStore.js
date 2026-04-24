import { create } from 'zustand';
import api from '../lib/api';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/notifications');
      const unread = data.filter(n => !n.isRead).length;
      set({ notifications: data, unreadCount: unread, loading: false });
    } catch (err) {
      console.error('[NOTIF] fetch error:', err.message);
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      set({ unreadCount: data.count });
    } catch { /* silent */ }
  },

  markAllRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set(s => ({
        unreadCount: 0,
        notifications: s.notifications.map(n => ({ ...n, isRead: true }))
      }));
    } catch (err) {
      console.error('[NOTIF] markAllRead error:', err.message);
    }
  },

  markOneRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set(s => ({
        notifications: s.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1)
      }));
    } catch { /* silent */ }
  },

  // Push a local notification (from socket events)
  addLocal: (notif) => {
    set(s => ({
      notifications: [notif, ...s.notifications],
      unreadCount: s.unreadCount + 1
    }));
  }
}));
