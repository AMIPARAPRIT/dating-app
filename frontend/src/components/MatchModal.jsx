import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { cx } from '../lib/cn';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { FiMessageCircle, FiZap } from 'react-icons/fi';

function getInsight(me, other) {
  if (!me || !other) return null;
  const shared = (me.interests || []).filter(i => (other.interests || []).includes(i));
  if (shared.length >= 2) return `You both love ${shared[0]} and ${shared[1]}!`;
  if (shared.length === 1) return `You both enjoy ${shared[0]}!`;
  if (me.lookingFor && me.lookingFor === other.lookingFor) return `You're both looking for ${me.lookingFor}.`;
  return "You could be a great match!";
}

export default function MatchModal({ match, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // Multi-burst confetti
    const fire = (opts) => confetti({ ...opts, colors: ['#f43f5e', '#ec4899', '#a855f7', '#fbbf24'] });
    fire({ particleCount: 80, spread: 60, origin: { x: 0.3, y: 0.6 } });
    setTimeout(() => fire({ particleCount: 80, spread: 60, origin: { x: 0.7, y: 0.6 } }), 200);
    setTimeout(() => fire({ particleCount: 40, spread: 100, origin: { x: 0.5, y: 0.4 } }), 400);
  }, []);

  const other   = match.user1?._id?.toString() === user?._id?.toString() ? match.user2 : match.user1;
  const insight = getInsight(user, other);

  const myAvatar    = user?.photos?.[0]    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'Me')}&background=ec4899&color=fff&size=160`;
  const otherAvatar = other?.photos?.[0]   || `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.name || '?')}&background=a855f7&color=fff&size=160`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center px-5"
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.6, opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 18, stiffness: 260 }}
        className="w-full max-w-sm"
      >
        {/* Glow ring */}
        <div className="relative">
          <div className={`absolute inset-0 ${cx.gradientBrand} blur-3xl opacity-20 rounded-3xl scale-110`} />

          <div className={`relative ${cx.cardGlass} p-7 text-center overflow-hidden`}>
            {/* Animated background shimmer */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none"
            />

            <div className="text-4xl mb-3">💘</div>
            <h2 className={`text-3xl font-black ${cx.gradientText} mb-1`}>It's a Match!</h2>
            <p className="text-gray-400 text-sm mb-6">
              You and <span className="text-white font-semibold">{other?.name || 'someone'}</span> liked each other
            </p>

            {/* Avatars */}
            <div className="flex justify-center items-center gap-0 mb-5">
              <motion.div
                initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                className="w-20 h-20 rounded-full overflow-hidden border-4 border-pink-500 shadow-xl shadow-pink-500/30 z-10">
                <img src={myAvatar} alt="You" className="w-full h-full object-cover" />
              </motion.div>
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35, type: 'spring' }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-sm font-black z-20 -mx-2 shadow-lg">
                ❤
              </motion.div>
              <motion.div
                initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                className="w-20 h-20 rounded-full overflow-hidden border-4 border-purple-500 shadow-xl shadow-purple-500/30 z-10">
                <img src={otherAvatar} alt={other?.name} className="w-full h-full object-cover" />
              </motion.div>
            </div>

            {/* Compatibility */}
            <div className={`${cx.gradientBrand} text-white text-sm font-bold px-5 py-1.5 rounded-full inline-flex items-center gap-1.5 mb-4 shadow-lg`}>
              <FiZap size={13} /> {match.compatibilityScore || 0}% Compatible
            </div>

            {/* AI insight */}
            {insight && (
              <p className="text-gray-300 text-sm bg-white/5 rounded-xl px-4 py-2.5 mb-5 border border-white/10">
                ✨ {insight}
              </p>
            )}

            {/* Actions */}
            <div className="space-y-2.5">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { onClose(); navigate(`/chat/${match._id}`); }}
                className={`${cx.btnPrimary} w-full gap-2`}>
                <FiMessageCircle size={18} /> Send Message
              </motion.button>
              <button onClick={onClose}
                className={`${cx.btnSecondary} w-full text-sm`}>
                Keep Browsing
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
