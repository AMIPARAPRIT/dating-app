import { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { FiHeart, FiX, FiStar, FiMapPin, FiSliders, FiInfo, FiZap } from 'react-icons/fi';
import { useMatchStore } from '../store/useMatchStore';
import { useAuthStore } from '../store/useAuthStore';
import { useAnalyticsStore } from '../store/useAnalyticsStore';
import MatchModal from '../components/MatchModal';
import FilterModal from '../components/FilterModal';
import ActiveFilterChips from '../components/ActiveFilterChips';
import FullProfileView from '../components/FullProfileView';
import { cx } from '../lib/cn';
import toast from 'react-hot-toast';

const QUICK_FILTERS = [
  { label: '📍 Nearby',     filters: { distance: 15 } },
  { label: '🌙 Night Owls', filters: { lifestyle_schedule: 'night' } },
  { label: '☀️ Early Birds', filters: { lifestyle_schedule: 'morning' } },
  { label: '💘 Serious',    filters: { intent: 'serious' } },
  { label: '🎉 Casual',     filters: { intent: 'casual' } },
];

// ── Top Picks horizontal strip ────────────────────────────────────────────────
function TopPicksStrip({ onViewProfile }) {
  const { topMatches, topMatchesLoading, fetchTopMatches } = useAnalyticsStore();

  useEffect(() => { fetchTopMatches(); }, []);

  if (topMatchesLoading) return (
    <div className="flex items-center gap-2 px-4 sm:px-6 py-2">
      <FiZap size={13} className="text-pink-400 shrink-0" />
      <span className="text-xs text-gray-500 animate-pulse">Loading top picks…</span>
    </div>
  );

  if (!topMatches?.length) return null;

  return (
    <div className="shrink-0">
      <div className="flex items-center gap-2 px-4 sm:px-6 mb-2">
        <FiZap size={13} className="text-pink-400" />
        <span className="text-xs font-bold text-pink-400 uppercase tracking-widest">Top Picks for You</span>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-1 scrollbar-hide">
        {topMatches.map((profile, i) => {
          const age = profile.dob
            ? Math.floor((Date.now() - new Date(profile.dob)) / 31557600000)
            : null;
          const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || '?')}&background=ec4899&color=fff&size=120`;
          return (
            <motion.button
              key={profile._id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewProfile(profile)}
              className="shrink-0 relative w-20 flex flex-col items-center gap-1"
            >
              {/* Avatar */}
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-pink-500/50">
                <img
                  src={profile.photos?.[0] || fallback}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = fallback; }}
                />
                {/* Best Match badge on top pick */}
                {i === 0 && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-pink-500/80 to-transparent px-1 pt-0.5 pb-1">
                    <p className="text-[8px] font-black text-white text-center leading-none">BEST</p>
                  </div>
                )}
                {/* Score badge */}
                <div className={`absolute bottom-0 right-0 ${cx.gradientBrand} text-white text-[9px] font-black px-1.5 py-0.5 rounded-tl-lg`}>
                  {profile.compatibilityScore}%
                </div>
              </div>
              <p className="text-white text-[10px] font-medium truncate w-full text-center">
                {profile.name}{age ? `, ${age}` : ''}
              </p>
            </motion.button>
          );
        })}
      </div>
      {/* Divider */}
      <div className="mx-4 sm:mx-6 mt-2 border-t border-white/5" />
    </div>
  );
}

// Isolated card component — each card gets its own fresh motion values
function SwipeCard({ profile, currentUser, onLike, onPass, onViewProfile, nextPhoto }) {
  const x           = useMotionValue(0);
  const rotate      = useTransform(x, [-200, 200], [-25, 25]);
  const likeOpacity = useTransform(x, [20, 100],   [0, 1]);
  const passOpacity = useTransform(x, [-100, -20], [1, 0]);

  const exitDir = useRef(0);

  const ageNum = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob)) / 31557600000)
    : null;

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 100) {
      exitDir.current = 1;
      onLike();
    } else if (info.offset.x < -100) {
      exitDir.current = -1;
      onPass();
    } else {
      x.set(0);
    }
  };

  const commonInterests = (profile.interests || []).filter(i => (currentUser?.interests || []).includes(i));
  let explainLabel = null;
  if (commonInterests.length > 1) {
    explainLabel = `You both like ${commonInterests[0]} & ${commonInterests[1]}`;
  } else if (commonInterests.length === 1) {
    explainLabel = `You both like ${commonInterests[0]}`;
  }


  return (
    <>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={profile._id}
          className={`${cx.swipeCard} border border-white/10`}
          style={{ x, rotate }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragEnd={handleDragEnd}
          whileTap={{ cursor: 'grabbing' }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: { duration: 0.2 } }}
          exit={{ x: exitDir.current >= 0 ? 1000 : -1000, opacity: 0, scale: 0.5, transition: { duration: 0.25 } }}
        >
          <img
            src={profile.photos?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random&size=400&color=fff`}
            alt={profile.name}
            className="w-full h-full object-cover"
            draggable={false}
          />

          <button
            onClick={e => { e.stopPropagation(); onViewProfile(profile); }}
            className="absolute top-4 right-4 w-9 h-9 bg-black/40 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors z-20">
            <FiInfo size={16} />
          </button>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 sm:p-6 pt-16 sm:pt-20">
            <div className="flex items-end justify-between gap-3 mb-2 sm:mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-2xl sm:text-3xl font-bold truncate">{profile.name}{ageNum ? `, ${ageNum}` : ''}</h2>
                  {profile.verified && <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>}
                  {profile.isDemo && <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 text-[10px] font-bold rounded-md uppercase border border-pink-500/30 shrink-0">Demo</span>}
                </div>
                {profile.jobTitle && <p className="text-gray-300 text-sm italic">💼 {profile.jobTitle}</p>}
              </div>
              <div className={`${cx.gradientBrand} text-white text-sm font-black px-3 py-1 rounded-full shrink-0 flex flex-col items-center justify-center`}>
                <span>{profile.compatibilityScore || 0}% Match</span>
              </div>
            </div>

            {explainLabel && (
              <div className="mb-3">
                <span className="bg-pink-500/20 text-pink-300 text-xs font-bold px-2.5 py-1 rounded-md border border-pink-500/30">
                  ✨ {explainLabel}
                </span>
              </div>
            )}

            {profile.prompts?.[0]?.answer && (
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 mb-3 border border-white/10">
                <p className="text-pink-400 text-[10px] font-black uppercase tracking-widest mb-1">{profile.prompts[0].question}</p>
                <p className="text-gray-200 text-sm italic">"{profile.prompts[0].answer}"</p>
              </div>
            )}

            {profile.interests?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.slice(0, 5).map(i => (
                  <span key={i} className="px-2.5 py-0.5 bg-white/10 rounded-full text-xs text-white/90 border border-white/10">{i}</span>
                ))}
              </div>
            )}
          </div>

          <motion.div style={{ opacity: likeOpacity }}
            className="absolute top-10 left-6 border-[6px] border-green-500 text-green-500 font-black text-4xl px-4 py-1 rounded-2xl rotate-[-20deg] pointer-events-none z-20">
            LIKE
          </motion.div>
          <motion.div style={{ opacity: passOpacity }}
            className="absolute top-10 right-6 border-[6px] border-red-500 text-red-500 font-black text-4xl px-4 py-1 rounded-2xl rotate-[20deg] pointer-events-none z-20">
            NOPE
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Next card peek */}
      {nextPhoto && (
        <div className="absolute inset-0 rounded-3xl overflow-hidden scale-95 opacity-40 -z-10 blur-[2px]">
          <img src={nextPhoto} alt="" className="w-full h-full object-cover" draggable={false} />
        </div>
      )}
    </>
  );
}

export default function FeedPage() {
  const {
    feed, currentIndex, fetchFeed, fetchFilteredFeed,
    likeUser, passUser, superlikeUser,
    newMatch, clearNewMatch, loading, activeFilterCount,
    applyFilters, filters, resetFilters
  } = useMatchStore();

  const { user: currentUser } = useAuthStore();
  const [showFilter,  setShowFilter]  = useState(false);
  const [viewProfile, setViewProfile] = useState(null);

  useEffect(() => {
    if (activeFilterCount > 0) fetchFilteredFeed(true);
    else fetchFeed();
  }, []);

  const current = feed[currentIndex];

  const handleLike = (targetUser, advanceFeed = true) => {
    const target = targetUser || current;
    if (!target) return;
    // Only advance swipe stack when acting on the current feed card
    const shouldAdvance = advanceFeed && target._id === current?._id;
    console.log('[LIKE]', target._id, target.name, '| advance:', shouldAdvance);
    likeUser(target._id, shouldAdvance).then(result => {
      if (result?.matched) toast.success("It's a Match!", { icon: '🔥', duration: 4000 });
      else toast.success('Liked!', { icon: '❤️' });
    }).catch(() => toast.error('Something went wrong'));
  };

  const handlePass = (targetUser, advanceFeed = true) => {
    const target = targetUser || current;
    if (!target) return;
    const shouldAdvance = advanceFeed && target._id === current?._id;
    passUser(target._id, shouldAdvance);
  };

  const handleSuperLike = (targetUser, advanceFeed = true) => {
    const target = targetUser || current;
    if (!target) return;
    const shouldAdvance = advanceFeed && target._id === current?._id;
    toast.success('Super Liked! ⭐', { duration: 3000 });
    superlikeUser(target._id, shouldAdvance).then(result => {
      if (result?.matched) toast.success("It's a Match!", { icon: '🔥', duration: 4000 });
    }).catch(() => toast.error('Something went wrong'));
  };

  const handleQuickFilter = async (qf) => {
    await applyFilters({ ...filters, ...qf.filters });
    toast.success(`${qf.label} applied`);
  };

  if (loading && feed.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-5rem)] md:h-screen gap-4">
      <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 animate-pulse">Finding matches for you...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-gray-950">

      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-2 shrink-0">
        <h1 className={`text-xl sm:text-2xl font-bold ${cx.gradientText}`}>Discover</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          {current && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full border border-white/5">
              <FiMapPin size={11} className="text-pink-500" />
              <span>{current.location?.city || 'Nearby'}</span>
            </div>
          )}
          <button onClick={() => setShowFilter(true)}
            className="group relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-pink-500/50 transition-all active:scale-90">
            <FiSliders size={18} className={activeFilterCount > 0 ? 'text-pink-500' : 'text-gray-400 group-hover:text-white'} />
            {activeFilterCount > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 ${cx.gradientBrand} rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-gray-950`}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 overflow-x-auto px-4 sm:px-6 pb-2 shrink-0 scrollbar-hide">
        {QUICK_FILTERS.map(qf => (
          <button key={qf.label} onClick={() => handleQuickFilter(qf)}
            className="text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 bg-white/5 text-gray-400 hover:border-pink-500 hover:text-white whitespace-nowrap shrink-0 transition-all active:scale-95">
            {qf.label}
          </button>
        ))}
      </div>

      {/* Active chips */}
      <div className="px-4 sm:px-6 shrink-0">
        <ActiveFilterChips onOpenFilter={() => setShowFilter(true)} />
      </div>

      {/* Top Picks strip */}
      <TopPicksStrip onViewProfile={setViewProfile} />

      {/* Card area */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {!current ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="text-6xl mb-4">{activeFilterCount > 0 ? '🔭' : '🥂'}</div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3">
              {activeFilterCount > 0 ? 'No exact matches' : "You've seen everyone!"}
            </h2>
            <p className="text-gray-400 text-sm mb-8 max-w-xs">
              {activeFilterCount > 0
                ? 'Try broadening your filters to see more people.'
                : 'Check back soon for new faces in your area.'}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-[200px]">
              {activeFilterCount > 0 ? (
                <>
                  <button onClick={() => setShowFilter(true)} className={cx.btnPrimary}>Adjust Filters</button>
                  <button onClick={resetFilters} className={cx.btnSecondary}>Reset All</button>
                </>
              ) : (
                <button onClick={fetchFeed} className={cx.btnPrimary}>Refresh Feed</button>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:items-center lg:gap-8 lg:px-8 lg:py-4">

            {/* Swipe card */}
            <div className="flex-1 min-h-0 relative mx-3 sm:mx-4 mt-1 mb-2 lg:mx-0 lg:mt-0 lg:mb-0 lg:max-w-sm lg:h-full">
              <SwipeCard
                key={current._id}
                profile={current}
                currentUser={currentUser}
                onLike={() => handleLike(current)}
                onPass={() => handlePass(current)}
                onViewProfile={setViewProfile}
                nextPhoto={feed[currentIndex + 1]?.photos?.[0] || null}
              />
            </div>

            {/* Action buttons */}
            <div className="flex lg:flex-col items-center justify-center gap-6 lg:gap-5 pb-4 lg:pb-0 pt-2 lg:pt-0 shrink-0">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handlePass(current)}
                className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-gray-900 border border-white/10 flex items-center justify-center text-red-500 shadow-xl hover:bg-red-500/10 hover:border-red-500/50 transition-all">
                <FiX size={28} />
              </motion.button>

              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleLike(current)}
                className={`w-20 h-20 lg:w-24 lg:h-24 rounded-full ${cx.gradientBrand} flex items-center justify-center text-white shadow-2xl shadow-pink-500/40`}>
                <FiHeart size={34} className="fill-white" />
              </motion.button>

              {/* ⭐ Super Like — fully wired */}
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleSuperLike(current)}
                className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-gray-900 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-xl hover:bg-yellow-500/10 hover:border-yellow-500/60 transition-all">
                <FiStar size={22} className="fill-yellow-400/30" />
              </motion.button>
            </div>
          </div>
        )}
      </div>

      <FilterModal open={showFilter} onClose={() => setShowFilter(false)} />
      <AnimatePresence>
        {newMatch && <MatchModal match={newMatch} onClose={clearNewMatch} />}
      </AnimatePresence>

      <AnimatePresence>
        {viewProfile && (
          <FullProfileView
            profile={viewProfile}
            currentUser={currentUser}
            onClose={() => setViewProfile(null)}
            onLike={() => { handleLike(viewProfile); setViewProfile(null); }}
            onPass={() => { handlePass(viewProfile); setViewProfile(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
