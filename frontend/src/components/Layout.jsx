import { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHeart, FiUser, FiZap, FiBell, FiBarChart2, FiMessageCircle } from 'react-icons/fi';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

const navItems = [
  { to: '/feed',          icon: FiZap,           label: 'Discover'      },
  { to: '/matches',       icon: FiHeart,         label: 'Matches'       },
  { to: '/chats',         icon: FiMessageCircle, label: 'Chat'          },
  { to: '/notifications', icon: FiBell,          label: 'Notifications' },
  { to: '/insights',      icon: FiBarChart2,     label: 'Insights'      },
  { to: '/profile',       icon: FiUser,          label: 'Profile'       },
];

export default function Layout() {
  const { token } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  const { totalUnread, fetchConversations } = useChatStore();

  // Poll unread count every 30s
  useEffect(() => {
    if (!token) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Poll chat conversations for unread badge
  useEffect(() => {
    if (!token) return;
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* ── Sidebar (md+) ── */}
      <aside className="hidden md:flex flex-col w-20 lg:w-56 shrink-0 border-r border-white/10 bg-gray-900/60 backdrop-blur sticky top-0 h-screen">
        <div className="px-4 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 via-pink-500 to-purple-500 flex items-center justify-center shrink-0">
            <FiHeart size={18} className="text-white fill-white" />
          </div>
          <span className="hidden lg:block text-lg font-bold bg-gradient-to-br from-rose-500 to-purple-500 bg-clip-text text-transparent">
            Spark
          </span>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative ${
                isActive ? 'bg-pink-500/15 text-pink-400' : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`
            }>
              {({ isActive }) => (
                <>
                  <motion.div whileTap={{ scale: 0.85 }} className="relative">
                    <Icon size={20} className={isActive ? 'fill-pink-400/30' : ''} />
                    {to === '/notifications' && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pink-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {to === '/chats' && totalUnread > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pink-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </motion.div>
                  <span className="hidden lg:block text-sm font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto w-full h-full">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-gray-900/95 backdrop-blur border-t border-white/10 z-10">
        <div className="flex justify-around items-center py-2 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1 px-3 transition-all ${
                isActive ? 'text-pink-500' : 'text-gray-500'
              }`
            }>
              {({ isActive }) => (
                <>
                  <motion.div whileTap={{ scale: 0.85 }} className="relative">
                    <Icon size={22} className={isActive ? 'fill-pink-500/30' : ''} />
                    {to === '/notifications' && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pink-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {to === '/chats' && totalUnread > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pink-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </motion.div>
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
