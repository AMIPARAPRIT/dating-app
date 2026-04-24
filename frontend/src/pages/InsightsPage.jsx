import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHeart, FiEye, FiMessageCircle, FiTrendingUp,
  FiStar, FiZap, FiRefreshCw, FiAward, FiTarget, FiCheckCircle
} from 'react-icons/fi';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { useAnalyticsStore } from '../store/useAnalyticsStore';
import { useAuthStore } from '../store/useAuthStore';
import { cx } from '../lib/cn';

// ── Animated progress bar ─────────────────────────────────────────────────────
function ScoreBar({ label, value, color = 'pink', showPct = true }) {
  const gradients = {
    pink:   'from-pink-500 to-rose-500',
    purple: 'from-purple-500 to-indigo-500',
    blue:   'from-blue-500 to-cyan-500',
    green:  'from-green-500 to-emerald-500',
    yellow: 'from-yellow-500 to-orange-500',
  };
  const safe = Math.min(100, Math.max(0, value || 0));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        {showPct && <span className="text-white font-semibold">{safe}%</span>}
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${gradients[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${safe}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── Gradient stat card ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.03, y: -2 }}
      className={`relative overflow-hidden rounded-2xl p-4 border border-white/10 cursor-default ${gradient}`}
    >
      {/* Glow blob */}
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          <Icon size={18} className="text-white" />
        </div>
        <p className="text-2xl font-black text-white">{value ?? '—'}</p>
        <p className="text-white/70 text-xs font-medium mt-0.5">{label}</p>
        {sub && <p className="text-white/50 text-[10px] mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`${cx.cardGlass} p-5`}
    >
      <h2 className="font-bold text-white mb-4">{title}</h2>
      {children}
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="text-7xl mb-5"
      >
        📊
      </motion.div>
      <h2 className="text-xl font-bold text-white mb-2">No data yet</h2>
      <p className="text-gray-400 text-sm max-w-xs">
        Start swiping to unlock your personal insights and analytics dashboard.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const { insights, loading, fetchInsights } = useAnalyticsStore();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchInsights(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInsights();
    setRefreshing(false);
  };

  if (loading && !insights) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm animate-pulse">Loading your analytics…</p>
      </div>
    );
  }

  const d = insights || {};
  const hasActivity = (d.totalLikesGiven || 0) > 0 || (d.totalMatches || 0) > 0;

  return (
    <div className="px-4 sm:px-6 pt-6 pb-10 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-xl sm:text-2xl font-black ${cx.gradientText}`}>Insights</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your data-driven dating analytics</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 hover:border-pink-500/50 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
        >
          <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </motion.button>
      </div>

      {/* ── Empty state ── */}
      {!hasActivity && !loading && <EmptyState />}

      {/* ── Stat cards grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={FiHeart} label="Likes Received" value={d.totalLikesReceived ?? 0}
          sub="people liked you"
          gradient="bg-gradient-to-br from-pink-600 to-rose-700"
          delay={0}
        />
        <StatCard
          icon={FiZap} label="Total Matches" value={d.totalMatches ?? 0}
          sub="mutual connections"
          gradient="bg-gradient-to-br from-purple-600 to-indigo-700"
          delay={0.05}
        />
        <StatCard
          icon={FiEye} label="Profile Views" value={d.totalProfileViews ?? 0}
          sub="people checked you"
          gradient="bg-gradient-to-br from-blue-600 to-cyan-700"
          delay={0.1}
        />
        <StatCard
          icon={FiMessageCircle} label="Active Chats" value={d.totalChats ?? 0}
          sub="conversations"
          gradient="bg-gradient-to-br from-green-600 to-emerald-700"
          delay={0.15}
        />
        <StatCard
          icon={FiTrendingUp} label="Match Rate" value={`${d.matchRate ?? 0}%`}
          sub="likes → matches"
          gradient="bg-gradient-to-br from-yellow-600 to-orange-700"
          delay={0.2}
        />
        <StatCard
          icon={FiStar} label="Profile Score" value={`${d.profileScore ?? 0}%`}
          sub="completeness"
          gradient="bg-gradient-to-br from-rose-600 to-pink-700"
          delay={0.25}
        />
      </div>

      {/* ── Profile Performance Funnel ── */}
      <Section title="📈 Profile Performance" delay={0.3}>
        <div className="space-y-3">
          <ScoreBar label={`Views → Engagement  (${d.totalProfileViews ?? 0} views)`} value={d.conversionRate} color="blue" />
          <ScoreBar label={`Likes → Match Rate  (${d.totalLikesGiven ?? 0} likes given)`} value={d.successRate} color="purple" />
          <ScoreBar label="Profile Completeness" value={d.profileScore} color="pink" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: 'Views',   val: d.totalProfileViews ?? 0, color: 'text-blue-400' },
            { label: 'Likes',   val: d.totalLikesReceived ?? 0, color: 'text-pink-400' },
            { label: 'Matches', val: d.totalMatches ?? 0, color: 'text-purple-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
              <p className={`text-xl font-black ${color}`}>{val}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Match Quality ── */}
      {(d.totalMatches || 0) > 0 && (
        <Section title="🏆 Match Quality" delay={0.35}>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Avg Score',    val: `${d.avgCompatibility ?? 0}%`, color: 'text-pink-400' },
              { label: 'Best Match',   val: `${d.highestMatch ?? 0}%`,     color: 'text-green-400' },
              { label: 'Lowest Match', val: `${d.lowestMatch ?? 0}%`,      color: 'text-yellow-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className={`text-lg font-black ${color}`}>{val}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <ScoreBar label="Average Compatibility" value={d.avgCompatibility} color="pink" />
        </Section>
      )}

      {/* ── Weekly Activity Chart ── */}
      {d.weeklyActivity?.length > 0 && (
        <Section title="📅 Weekly Activity" delay={0.4}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={d.weeklyActivity} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="gLikes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ec4899" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMatches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }} />
              <Area type="monotone" dataKey="likes"   name="Likes"   stroke="#ec4899" strokeWidth={2} fill="url(#gLikes)"   dot={false} />
              <Area type="monotone" dataKey="matches" name="Matches" stroke="#a855f7" strokeWidth={2} fill="url(#gMatches)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── Match Trend Bar Chart ── */}
      {d.weeklyActivity?.length > 0 && (
        <Section title="📊 Match Trendline" delay={0.45}>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={d.weeklyActivity} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="matches" name="Matches" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="likes"   name="Likes"   fill="#ec4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── Smart Insights ── */}
      {d.smartInsights?.length > 0 && (
        <Section title="🧠 Your Insights" delay={0.5}>
          <div className="space-y-3">
            {d.smartInsights.map((ins, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.07 }}
                className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5"
              >
                <span className="text-xl shrink-0 mt-0.5">{ins.icon}</span>
                <p className="text-gray-300 text-sm leading-relaxed">{ins.text}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Action Suggestions ── */}
      {d.suggestions?.length > 0 && (
        <Section title="🚀 Improve Your Results" delay={0.55}>
          <div className="space-y-2">
            {d.suggestions.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.06 }}
                className="flex items-center gap-3 py-2"
              >
                <FiCheckCircle size={16} className="text-pink-400 shrink-0" />
                <p className="text-gray-300 text-sm">{s}</p>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Recent Match Breakdowns ── */}
      {d.matchBreakdowns?.length > 0 && (
        <Section title="💞 Recent Match Breakdowns" delay={0.6}>
          <div className="space-y-5">
            {d.matchBreakdowns.map((mb, i) => {
              const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(mb.otherUser?.name || '?')}&background=ec4899&color=fff&size=64`;
              return (
                <div key={mb.matchId || i}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-pink-500/30">
                      <img
                        src={mb.otherUser?.photo || fallback}
                        alt={mb.otherUser?.name}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = fallback; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{mb.otherUser?.name}</p>
                      <p className="text-xs text-gray-500">Compatibility breakdown</p>
                    </div>
                    <div className={`${cx.gradientBrand} text-white text-sm font-black px-3 py-1 rounded-full`}>
                      {mb.totalScore}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <ScoreBar label="🎯 Interests"  value={mb.breakdown?.interests} color="pink"   />
                    <ScoreBar label="🌿 Lifestyle"  value={mb.breakdown?.lifestyle} color="purple" />
                    <ScoreBar label="📍 Location"   value={mb.breakdown?.location}  color="blue"   />
                  </div>
                  {i < d.matchBreakdowns.length - 1 && <div className="border-t border-white/5 mt-4" />}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── How Scoring Works ── */}
      <Section title="⚙️ How Matching Works" delay={0.65}>
        <div className="space-y-2">
          {[
            { label: '🎯 Interests',  pct: 40, color: 'pink'   },
            { label: '📍 Location',   pct: 30, color: 'blue'   },
            { label: '🌿 Lifestyle',  pct: 30, color: 'purple' },
          ].map(({ label, pct, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-gray-400 text-sm w-28 shrink-0">{label}</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${
                    color === 'pink' ? 'from-pink-500 to-rose-500' :
                    color === 'blue' ? 'from-blue-500 to-cyan-500' :
                    'from-purple-500 to-indigo-500'
                  } rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                />
              </div>
              <span className={`text-sm font-bold w-8 text-right ${
                color === 'pink' ? 'text-pink-400' :
                color === 'blue' ? 'text-blue-400' : 'text-purple-400'
              }`}>{pct}%</span>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-3">Feed is sorted by score — highest compatibility shown first.</p>
      </Section>

    </div>
  );
}
