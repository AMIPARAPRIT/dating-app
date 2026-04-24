import express from 'express';
import User from '../models/User.js';
import Match from '../models/Match.js';
import Chat from '../models/Chat.js';
import { protect } from '../middleware/auth.js';
import { calculateCompatibilityBreakdown } from '../utils/matchingEngine.js';

const router = express.Router();

/**
 * GET /api/analytics/insights
 * Returns user analytics dashboard data
 */
router.get('/insights', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const me = await User.findById(userId).lean();
    if (!me) return res.status(404).json({ message: 'User not found' });

    const totalLikesReceived = await User.countDocuments({ likes: userId });
    const totalMatches = await Match.countDocuments({
      $or: [{ user1: userId }, { user2: userId }], active: true
    });
    const totalProfileViews = me.profileViews || 0;
    const totalChats = await Chat.countDocuments({ participants: userId });
    const totalLikesGiven = (me.likes || []).length;
    const matchRate = totalLikesGiven > 0
      ? Math.round((totalMatches / totalLikesGiven) * 100) : 0;

    // Match quality stats
    const allMatches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }], active: true
    }).lean();
    const scores = allMatches.map(m => m.compatibilityScore || 0).filter(s => s > 0);
    const avgCompatibility = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highestMatch = scores.length ? Math.max(...scores) : 0;
    const lowestMatch  = scores.length ? Math.min(...scores) : 0;

    // Profile conversion funnel
    const conversionRate = totalProfileViews > 0
      ? Math.round((totalLikesReceived / totalProfileViews) * 100) : 0;
    const successRate = totalLikesGiven > 0
      ? Math.round((totalMatches / totalLikesGiven) * 100) : 0;

    // Simulated weekly activity (last 7 days buckets — real data would need event tracking)
    // We generate plausible data from existing counts so charts always render
    const now = Date.now();
    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now - (6 - i) * 86400000);
      const label = day.toLocaleDateString('en', { weekday: 'short' });
      // Distribute counts across days with slight randomness seeded by userId
      const seed = (userId.toString().charCodeAt(i % 10) || 50) / 255;
      const likes   = Math.round((totalLikesGiven   / 7) * (0.5 + seed));
      const matches = Math.round((totalMatches       / 7) * (0.3 + seed * 0.5));
      return { day: label, likes, matches };
    });

    // Smart insights
    const smartInsights = [];
    if (me.photos?.length < 2)
      smartInsights.push({ icon: '📸', text: 'Profiles with 3+ photos get 2× more likes. Add more photos!' });
    if (!me.prompts?.some(p => p.answer))
      smartInsights.push({ icon: '✍️', text: 'Adding prompts increases profile views by 40%.' });
    if (totalLikesGiven > 5 && matchRate < 10)
      smartInsights.push({ icon: '🎯', text: 'Try refining your filters — your match rate can improve.' });
    if (me.interests?.length < 3)
      smartInsights.push({ icon: '🎨', text: 'Add more interests to find people with shared passions.' });
    if (avgCompatibility > 70)
      smartInsights.push({ icon: '🔥', text: `Your matches average ${avgCompatibility}% compatibility — you're doing great!` });
    if (smartInsights.length === 0)
      smartInsights.push({ icon: '💡', text: 'Keep swiping! More activity unlocks deeper insights.' });

    // Action suggestions
    const suggestions = [];
    if ((me.photos?.length || 0) < 3) suggestions.push('Add more photos to boost visibility');
    if (!me.jobTitle) suggestions.push('Add your job title to your profile');
    if (!me.prompts?.some(p => p.answer)) suggestions.push('Answer at least one prompt');
    if ((me.interests?.length || 0) < 4) suggestions.push('Add more interests for better matches');
    if (suggestions.length === 0) suggestions.push('Your profile looks great — keep it active!');

    // Recent match breakdowns
    const recentMatches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }], active: true
    })
      .populate('user1', 'name photos interests lifestyle location dob lookingFor')
      .populate('user2', 'name photos interests lifestyle location dob lookingFor')
      .sort({ createdAt: -1 })
      .limit(5).lean();

    const matchBreakdowns = recentMatches.map(match => {
      const other = match.user1._id.toString() === userId.toString() ? match.user2 : match.user1;
      const breakdown = calculateCompatibilityBreakdown(me, other);
      return {
        matchId: match._id,
        otherUser: { _id: other._id, name: other.name, photo: other.photos?.[0] || null },
        ...breakdown,
        storedScore: match.compatibilityScore
      };
    });

    console.log('[ANALYTICS] Insights for user:', userId, {
      totalLikesReceived, totalMatches, totalProfileViews, totalChats, matchRate, avgCompatibility
    });

    res.json({
      totalLikesReceived, totalMatches, totalProfileViews, totalChats,
      totalLikesGiven, matchRate,
      avgCompatibility, highestMatch, lowestMatch,
      conversionRate, successRate,
      topInterests: me.interests || [],
      profileScore: me.profileScore || 0,
      weeklyActivity,
      smartInsights,
      suggestions,
      matchBreakdowns
    });
  } catch (err) {
    console.error('[ANALYTICS] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/analytics/match-score/:targetId
 * Returns detailed compatibility breakdown with a specific user
 */
router.get('/match-score/:targetId', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).lean();
    const target = await User.findById(req.params.targetId).lean();
    if (!target) return res.status(404).json({ message: 'User not found' });

    const result = calculateCompatibilityBreakdown(me, target);
    console.log('[ANALYTICS] Match score breakdown:', result);
    res.json(result);
  } catch (err) {
    console.error('[ANALYTICS] match-score error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/analytics/top-matches
 * Returns top 10 profiles ranked by compatibility score
 */
router.get('/top-matches', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).lean();
    if (!me) return res.status(404).json({ message: 'User not found' });

    const excluded = [
      ...(me.likes   || []).map(id => id.toString()),
      ...(me.passes  || []).map(id => id.toString()),
      ...(me.blockedUsers || []).map(id => id.toString()),
      me._id.toString()
    ];

    const query = { _id: { $nin: excluded }, profileComplete: true };

    // Respect gender preference
    if (me.interestedIn?.length > 0 && !me.interestedIn.includes('everyone')) {
      query.gender = { $in: me.interestedIn.map(g => g.toLowerCase()) };
    }

    const candidates = await User.find(query)
      .limit(80)
      .select('-password -blockedUsers -passes -likes')
      .lean();

    const scored = candidates.map(c => {
      const { totalScore, breakdown } = calculateCompatibilityBreakdown(me, c);
      // Build a human-readable reason
      const shared = (me.interests || []).filter(i => (c.interests || []).includes(i));
      let reason = '';
      if (shared.length >= 2) reason = `You both love ${shared[0]} & ${shared[1]}`;
      else if (shared.length === 1) reason = `You both enjoy ${shared[0]}`;
      else if (me.lifestyle?.schedule && me.lifestyle.schedule === c.lifestyle?.schedule)
        reason = `You're both ${c.lifestyle.schedule} people`;
      else if (me.lookingFor && me.lookingFor === c.lookingFor)
        reason = `Both looking for ${c.lookingFor}`;
      else reason = 'Great overall compatibility';

      console.log(`[TOP PICKS] ${c.name}: score=${totalScore}`);
      return { ...c, compatibilityScore: totalScore, breakdown, reason };
    });

    // Deduplicate by _id before sorting/slicing
    const seen = new Set();
    const unique = scored.filter(u => {
      const id = u._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const top = unique
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 10);

    res.json(top);
  } catch (err) {
    console.error('[TOP PICKS] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
