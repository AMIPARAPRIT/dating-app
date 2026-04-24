import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/useNotificationStore';
import { cx } from '../lib/cn';
import { FiHeart, FiZap, FiMessageCircle, FiBell, FiCheck } from 'react-icons/fi';

const TYPE_CONFIG = {
  like:      { icon: FiHeart,         color: 'text-pink-400',   bg: 'bg-pink-500/15'   },
  match:     { icon: FiZap,           color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  superlike: { icon: FiZap,           color: 'text-blue-400',   bg: 'bg-blue-500/15'   },
  message:   { icon: FiMessageCircle, color: 'text-green-400',  bg: 'bg-green-500/15'  },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, fetchNotifications, markAllRead, markOneRead } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => { fetchNotifications(); }, []);

  const handleClick = async (notif) => {
    if (!notif.isRead) await markOneRead(notif._id);
    if (notif.type === 'match' && notif.matchId) {
      navigate(`/chat/${notif.matchId}`);
    }
  };

  return (
    <div className="px-4 sm:px-6 pt-6 pb-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className={`text-xl sm:text-2xl font-bold ${cx.gradientText}`}>Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-xl transition-all">
            <FiCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <FiBell size={28} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium mb-1">No notifications yet</p>
          <p className="text-gray-600 text-sm">Start liking profiles to get activity!</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {notifications.map((notif, i) => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.like;
              const Icon = cfg.icon;
              const avatar = notif.fromUser?.photos?.[0]
                || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.fromUser?.name || '?')}&background=ec4899&color=fff&size=48`;

              return (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleClick(notif)}
                  className={`${cx.cardGlass} p-4 flex items-center gap-4 cursor-pointer transition-all hover:bg-white/10 active:scale-[0.98] ${
                    !notif.isRead ? 'border-pink-500/30 bg-pink-500/5' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <img src={avatar} alt="" className="w-full h-full object-cover"
                        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=?&background=ec4899&color=fff&size=48`; }} />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${cfg.bg} rounded-full flex items-center justify-center border-2 border-gray-900`}>
                      <Icon size={12} className={cfg.color} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${notif.isRead ? 'text-gray-300' : 'text-white font-medium'}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{timeAgo(notif.createdAt)}</p>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
