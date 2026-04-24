import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiHeart, FiMapPin, FiStar, FiBriefcase, FiZap } from 'react-icons/fi';
import { cx } from '../lib/cn';

// AI insight generator based on shared data
function getAIInsight(me, other) {
  if (!me || !other) return null;
  const shared = (me.interests || []).filter(i => (other.interests || []).includes(i));
  const sameSchedule = me.lifestyle?.schedule && me.lifestyle.schedule === other.lifestyle?.schedule;
  const sameIntent = me.lookingFor && me.lookingFor === other.lookingFor;

  const parts = [];
  if (shared.length >= 2) parts.push(`You both love ${shared[0]} and ${shared[1]}`);
  else if (shared.length === 1) parts.push(`You both enjoy ${shared[0]}`);
  if (sameSchedule) parts.push(`you're both ${other.lifestyle.schedule} people`);
  if (sameIntent) parts.push(`you're both looking for ${other.lookingFor}`);

  if (parts.length === 0) return "You could be a great match — say hello!";
  return parts.join(', ') + '.';
}

// Client-side score breakdown (mirrors backend analytics formula)
function getScoreBreakdown(me, other) {
  if (!me || !other) return null;
  // Interests (Jaccard)
  const a = new Set(me.interests || []);
  const b = new Set(other.interests || []);
  const interestScore = (a.size === 0 || b.size === 0)
    ? 30
    : Math.round(([...a].filter(i => b.has(i)).length / new Set([...a, ...b]).size) * 100);

  // Lifestyle
  const fields = ['schedule', 'personality', 'smoking', 'drinking', 'workout'];
  const l1 = me.lifestyle || {};
  const l2 = other.lifestyle || {};
  const filled = fields.filter(f => l1[f] && l2[f]);
  const lifestyleScore = filled.length === 0 ? 50 : Math.round((filled.filter(f => l1[f] === l2[f]).length / filled.length) * 100);

  return { interests: interestScore, lifestyle: lifestyleScore };
}

const LIFESTYLE_ICONS = {
  smoking:     { never: '🚭', sometimes: '🚬', often: '🚬' },
  drinking:    { never: '🧃', sometimes: '🍷', often: '🍺' },
  workout:     { never: '🛋️', sometimes: '🏃', often: '💪' },
  schedule:    { morning: '☀️', night: '🌙' },
  personality: { introvert: '🤫', extrovert: '🎉' },
};

export default function FullProfileView({ profile, currentUser, onClose, onLike, onPass }) {
  if (!profile) return null;

  const age = profile.dob
    ? Math.floor((Date.now() - new Date(profile.dob)) / 31557600000)
    : null;

  const insight = getAIInsight(currentUser, profile);
  const score = profile.compatibilityScore || 0;
  const breakdown = getScoreBreakdown(currentUser, profile);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={e => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-gray-900 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
          style={{ maxHeight: '92vh' }}
        >
          {/* Hero photo */}
          <div className="relative h-72 sm:h-80 shrink-0">
            <img
              src={profile.photos?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=ec4899&color=fff&size=400`}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />

            {/* Close button */}
            <button onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <FiX size={18} />
            </button>

            {/* Compatibility badge */}
            <div className={`absolute top-4 left-4 ${cx.gradientBrand} text-white text-sm font-black px-3 py-1 rounded-full shadow-lg`}>
              {score}% Match
            </div>

            {/* Photo strip (multiple photos) */}
            {profile.photos?.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {profile.photos.slice(0, 5).map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all ${i === 0 ? 'w-5 bg-white' : 'w-2 bg-white/40'}`} />
                ))}
              </div>
            )}

            {/* Name overlay */}
            <div className="absolute bottom-4 left-5 right-5">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    {profile.name}{age ? `, ${age}` : ''}
                    {profile.verified && <span className="ml-2 w-5 h-5 bg-blue-500 text-white rounded-full inline-flex items-center justify-center text-[10px] font-bold">✓</span>}
                  </h2>
                  {(profile.location?.city || profile.location?.country) && (
                    <p className="text-gray-300 text-sm flex items-center gap-1 mt-0.5">
                      <FiMapPin size={12} className="text-pink-400" />
                      {[profile.location.city, profile.location.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

            {/* Job */}
            {profile.jobTitle && (
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <FiBriefcase size={15} className="text-pink-400 shrink-0" />
                <span>{profile.jobTitle}{profile.education ? ` · ${profile.education}` : ''}</span>
              </div>
            )}

            {/* AI Compatibility insight */}
            <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FiZap size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">AI Insight</span>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed">"{insight}"</p>
              {/* Overall score bar */}
              <div className="mt-3 space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Overall Match</span><span className="text-pink-400 font-bold">{score}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${cx.gradientBrand} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                </div>
                {/* Breakdown bars */}
                {breakdown && (
                  <>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>🎯 Interests</span><span>{breakdown.interests}%</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-pink-500/70 rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${breakdown.interests}%` }}
                          transition={{ duration: 0.7, delay: 0.4 }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>🌿 Lifestyle</span><span>{breakdown.lifestyle}%</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-purple-500/70 rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${breakdown.lifestyle}%` }}
                          transition={{ duration: 0.7, delay: 0.5 }} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Prompts */}
            {profile.prompts?.filter(p => p.answer).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Prompts</h3>
                {profile.prompts.filter(p => p.answer).map((p, i) => (
                  <div key={i} className={`${cx.cardGlass} p-4`}>
                    <p className="text-pink-400 text-[11px] font-bold uppercase tracking-widest mb-1.5">{p.question}</p>
                    <p className="text-gray-200 text-sm leading-relaxed">"{p.answer}"</p>
                  </div>
                ))}
              </div>
            )}

            {/* Interests */}
            {profile.interests?.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map(i => (
                    <span key={i}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        (currentUser?.interests || []).includes(i)
                          ? 'border-pink-500 bg-pink-500/20 text-pink-400'
                          : 'border-white/10 bg-white/5 text-gray-300'
                      }`}>
                      {i}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Lifestyle */}
            {profile.lifestyle && Object.values(profile.lifestyle).some(Boolean) && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Lifestyle</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(profile.lifestyle).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className={`${cx.cardGlass} px-3 py-2.5 flex items-center gap-2`}>
                      <span className="text-lg">{LIFESTYLE_ICONS[k]?.[v] || '•'}</span>
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-wide capitalize">{k}</p>
                        <p className="text-white text-xs capitalize">{v}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Looking for */}
            {profile.lookingFor && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-pink-400">💘</span>
                <span className="text-gray-300">Looking for <span className="text-white font-medium capitalize">{profile.lookingFor}</span></span>
              </div>
            )}

            {/* Extra photos */}
            {profile.photos?.length > 1 && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">More Photos</h3>
                <div className="grid grid-cols-3 gap-2">
                  {profile.photos.slice(1).map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="h-2" />
          </div>

          {/* Action buttons */}
          <div className="px-5 py-4 border-t border-white/10 flex gap-3 shrink-0 bg-gray-900">
            <motion.button whileTap={{ scale: 0.95 }} onClick={onPass}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/10 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all font-semibold">
              <FiX size={20} /> Pass
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onLike}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl ${cx.gradientBrand} text-white font-semibold shadow-lg shadow-pink-500/30`}>
              <FiHeart size={20} className="fill-white" /> Like
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
