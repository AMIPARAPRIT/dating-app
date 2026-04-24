import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../store/useMatchStore';
import { useAuthStore } from '../store/useAuthStore';
import { cx } from '../lib/cn';
import { FiMessageCircle, FiHeart, FiZap, FiTrash2, FiX } from 'react-icons/fi';
import FullProfileView from '../components/FullProfileView';
import api from '../lib/api';
import toast from 'react-hot-toast';

function Avatar({ name, photo, size = 'md' }) {
  const s = size === 'sm' ? 'w-12 h-12' : 'w-14 h-14 sm:w-16 sm:h-16';
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=ec4899&color=fff&size=64`;
  return (
    <div className={`${s} rounded-full overflow-hidden shrink-0`}>
      <img src={photo || fallback} alt={name}
        className="w-full h-full object-cover"
        onError={e => { e.target.src = fallback; }} />
    </div>
  );
}

const TABS = [
  { id: 'matches', label: 'Matches',   icon: FiHeart },
  { id: 'liked',   label: 'You Liked', icon: FiZap   },
  { id: 'likedMe', label: 'Liked You', icon: FiHeart },
];

export default function MatchesPage() {
  const { matches, liked, likedMe, fetchMatches, fetchLikes, removeMatch, removeLike } = useMatchStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('matches');
  const [viewProfile, setViewProfile] = useState(null);

  useEffect(() => {
    fetchMatches();
    fetchLikes();
  }, []);

  const openProfile = async (userId) => {
    try {
      const { data } = await api.get(`/users/${userId}`);
      setViewProfile(data);
    } catch (err) {
      toast.error('Could not load profile');
    }
  };

  const getOther = (match) =>
    match.user1?._id?.toString() === user?._id?.toString() ? match.user2 : match.user1;

  const getAge = (dob) =>
    dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  return (
    <div className="px-4 sm:px-6 pt-6 pb-6">
      <h1 className={`text-xl sm:text-2xl font-bold mb-5 ${cx.gradientText}`}>Matches</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-5 border border-white/10">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count = id === 'matches' ? matches.length : id === 'liked' ? liked.length : likedMe.length;
          return (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === id
                  ? `${cx.gradientBrand} text-white shadow-lg`
                  : 'text-gray-400 hover:text-white'
              }`}>
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === id ? 'bg-white/20' : 'bg-white/10'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

          {/* ── MATCHES TAB ── */}
          {tab === 'matches' && (
            matches.length === 0 ? (
              <EmptyState icon="💔" title="No matches yet" sub="Keep swiping to find your spark!" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matches.map((match, i) => {
                  const other = getOther(match);
                  const age = getAge(other?.dob);
                  return (
                    <motion.div key={match._id}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`${cx.cardGlass} p-4 flex items-center gap-4`}>

                      <div className="relative shrink-0 cursor-pointer" onClick={() => openProfile(other?._id)}>
                        <Avatar name={other?.name} photo={other?.photos?.[0]} />
                        {other?.verified && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">✓</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold truncate">{other?.name}{age ? `, ${age}` : ''}</h3>
                          <span className="text-xs text-pink-400 font-bold shrink-0">{match.compatibilityScore}%</span>
                        </div>
                        <p className="text-gray-400 text-sm truncate">{other?.jobTitle || 'Tap to say hello!'}</p>
                        {other?.interests?.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {other.interests.slice(0, 3).map(t => (
                              <span key={t} className="text-[10px] px-2 py-0.5 bg-pink-500/10 text-pink-400 rounded-full border border-pink-500/20">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        {/* Start Chat button */}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => navigate(`/chat/${match._id}`)}
                          className={`w-9 h-9 rounded-xl ${cx.gradientBrand} flex items-center justify-center text-white shadow-lg shadow-pink-500/20 hover:opacity-90 transition-all`}
                          title="Start Chat"
                        >
                          <FiMessageCircle size={16} />
                        </motion.button>
                        <button onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('Remove this match?')) return;
                          try {
                            await removeMatch(match._id);
                            toast.success('Match removed');
                          } catch { toast.error('Failed to remove'); }
                        }}
                          className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          )}

          {/* ── YOU LIKED TAB ── */}
          {tab === 'liked' && (
            liked.length === 0 ? (
              <EmptyState icon="💫" title="No likes yet" sub="Start swiping to like people!" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {liked.map((u, i) => (
                  <LikedCard
                    key={u._id}
                    user={u}
                    i={i}
                    onView={() => openProfile(u._id)}
                    onChat={() => navigate(`/chat/liked/${u._id}`)}
                    onPass={async () => {
                      try {
                        await removeLike(u._id);
                        toast.success('Removed');
                      } catch { toast.error('Failed to remove'); }
                    }}
                  />
                ))}
              </div>
            )
          )}

          {/* ── LIKED YOU TAB ── */}
          {tab === 'likedMe' && (
            likedMe.length === 0 ? (
              <EmptyState icon="🌟" title="No one yet" sub="Keep building your profile to attract more people!" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {likedMe.map((u, i) => <UserCard key={u._id} user={u} i={i} blurred onClick={() => openProfile(u._id)} />)}
              </div>
            )
          )}

        </motion.div>
      </AnimatePresence>

      {/* Full profile view */}
      <AnimatePresence>
        {viewProfile && (
          <FullProfileView
            profile={viewProfile}
            currentUser={user}
            onClose={() => setViewProfile(null)}
            onLike={() => setViewProfile(null)}
            onPass={() => setViewProfile(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-gray-300 font-semibold mb-1">{title}</p>
      <p className="text-gray-500 text-sm max-w-xs">{sub}</p>
    </div>
  );
}

function UserCard({ user, i, blurred = false, onClick }) {
  const age = user.dob ? Math.floor((Date.now() - new Date(user.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || '?')}&background=ec4899&color=fff&size=200`;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.04 }}
      onClick={onClick}
      className={`${cx.cardGlass} overflow-hidden cursor-pointer hover:ring-2 hover:ring-pink-500/40 active:scale-[0.97] transition-all`}>
      <div className="aspect-[3/4] relative">
        <img src={user.photos?.[0] || fallback} alt={user.name}
          className={`w-full h-full object-cover ${blurred ? 'blur-sm scale-105' : ''}`}
          onError={e => { e.target.src = fallback; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {blurred && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-3 py-2 text-center">
              <FiHeart size={20} className="text-pink-400 mx-auto mb-1" />
              <p className="text-white text-xs font-semibold">Likes you</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-white font-semibold text-sm truncate">{user.name}{age ? `, ${age}` : ''}</p>
          {user.location?.city && <p className="text-gray-300 text-xs">{user.location.city}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function LikedCard({ user, i, onView, onChat, onPass }) {
  const age = user.dob ? Math.floor((Date.now() - new Date(user.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || '?')}&background=ec4899&color=fff&size=200`;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.04 }}
      className={`${cx.cardGlass} overflow-hidden`}>
      <div className="aspect-[3/4] relative cursor-pointer" onClick={onView}>
        <img src={user.photos?.[0] || fallback} alt={user.name}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = fallback; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-white font-semibold text-sm truncate">{user.name}{age ? `, ${age}` : ''}</p>
          {user.location?.city && <p className="text-gray-300 text-xs">{user.location.city}</p>}
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex gap-2 p-2">
        <button
          onClick={onPass}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-medium">
          <FiX size={13} /> Pass
        </button>
        <button
          onClick={onChat}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 transition-all text-xs font-medium">
          <FiMessageCircle size={13} /> Chat
        </button>
      </div>
    </motion.div>
  );
}
