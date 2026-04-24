import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiSearch } from 'react-icons/fi';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { cx } from '../lib/cn';
import { useState } from 'react';

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { conversations, fetchConversations } = useChatStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  const filtered = conversations.filter(c =>
    !search || c.other?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const openChat = (conv) => {
    const id = conv.virtualId || conv.matchId;
    navigate(`/chat/${id}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
        <h1 className={`text-xl sm:text-2xl font-bold mb-4 ${cx.gradientText}`}>Messages</h1>
        <div className="relative">
          <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className={`${cx.inputField} pl-9 text-sm`}
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <FiMessageCircle size={28} className="text-gray-500" />
            </div>
            <p className="text-gray-300 font-semibold mb-1">No conversations yet</p>
            <p className="text-gray-500 text-sm">Match with someone and start chatting!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((conv, i) => {
              const other = conv.other;
              const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.name || '?')}&background=ec4899&color=fff&size=80`;
              const lastText = conv.lastMessage
                ? conv.lastMessage.type === 'image' ? '📷 Photo'
                : conv.lastMessage.type === 'voice' ? '🎤 Voice message'
                : conv.lastMessage.content
                : 'Say hello!';

              return (
                <motion.button
                  key={conv._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => openChat(conv)}
                  className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/10">
                      <img
                        src={other?.photos?.[0] || fallback}
                        alt={other?.name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = fallback; }}
                      />
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-pink-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`font-semibold truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-gray-200'}`}>
                        {other?.name || 'Match'}
                        {other?.verified && <span className="ml-1 text-blue-400 text-xs">✓</span>}
                      </span>
                      <span className="text-[11px] text-gray-500 shrink-0 ml-2">
                        {timeAgo(conv.updatedAt)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                      {lastText}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
