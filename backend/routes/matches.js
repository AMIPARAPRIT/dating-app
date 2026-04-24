import express from 'express';
import User from '../models/User.js';
import Match from '../models/Match.js';
import Chat from '../models/Chat.js';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';
import { calculateCompatibility, calculateCompatibilityML, updateDynamicWeights } from '../utils/matchingEngine.js';

const router = express.Router();

// ─── GET /likes — people current user has liked ───────────────────────────────
router.get('/likes', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select('likes').lean();
    const users = await User.find({ _id: { $in: me.likes || [] } })
      .select('name photos jobTitle interests dob verified location')
      .lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /liked-me — people who liked current user ────────────────────────────
router.get('/liked-me', protect, async (req, res) => {
  try {
    const users = await User.find({ likes: req.user._id })
      .select('name photos jobTitle interests dob verified location')
      .lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /feed ────────────────────────────────────────────────────────────────
router.get('/feed', protect, async (req, res) => {
  console.log('[FEED] Fetching feed for user:', req.user._id);
  try {
    const me = await User.findById(req.user._id).lean();
    if (!me) return res.status(404).json({ message: 'User not found' });

    const excluded = [
      ...(me.likes || []).map(id => id.toString()),
      ...(me.passes || []).map(id => id.toString()),
      ...(me.blockedUsers || []).map(id => id.toString()),
      me._id.toString()
    ];

    const query = {
      _id: { $nin: excluded },
      profileComplete: true
    };

    // Apply gender preference — STRICT: always filter by interestedIn
    if (me.interestedIn?.length > 0 && !me.interestedIn.includes('everyone')) {
      const genderFilter = me.interestedIn.map(g => g.toLowerCase());
      query.gender = { $in: genderFilter };
    }

    console.log('[FEED] Query:', JSON.stringify(query));

    let candidates = await User.find(query)
      .limit(100)
      .select('-password -blockedUsers -passes -likes')
      .lean();

    // Fallback: widen pool but ALWAYS keep gender filter
    if (candidates.length === 0 && query.gender) {
      console.log('[FEED] Empty feed — widening pool but keeping gender filter');
      candidates = await User.find({
        _id: { $ne: me._id },
        profileComplete: true,
        gender: query.gender
      }).limit(30).select('-password -blockedUsers -passes -likes').lean();
    }

    // Last resort: no preference set at all
    if (candidates.length === 0 && !query.gender) {
      console.log('[FEED] No preference set — returning any complete profiles');
      candidates = await User.find({
        _id: { $ne: me._id },
        profileComplete: true
      }).limit(30).select('-password -blockedUsers -passes -likes').lean();
    }

    const scored = await Promise.all(candidates.map(async c => {
      const mlScore = await calculateCompatibilityML(c, me);
      return { ...c, compatibilityScore: mlScore };
    }));
    scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Deduplicate by _id
    const seenIds = new Set();
    const unique = scored.filter(u => {
      const id = u._id.toString();
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    const result = unique.slice(0, 30);
    console.log(`[FEED] Returning ${result.length} users`);
    res.json(result);
  } catch (err) {
    console.error('[FEED] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /like/:targetId ─────────────────────────────────────────────────────
router.post('/like/:targetId', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const target = await User.findById(req.params.targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    console.log(`[LIKE] User ${me._id} liked ${target._id}`);
    await User.findByIdAndUpdate(me._id, { $addToSet: { likes: target._id } });
    
    // Update dynamic weights based on this 'like' action
    await updateDynamicWeights(me, target, 'like').catch(err => console.error('[LIKE] Weight update error:', err.message));

    // Notify target that someone liked them
    await Notification.create({
      userId:   target._id,
      fromUser: me._id,
      type:     'like',
      message:  `${me.name} liked your profile!`
    }).catch(err => console.error('[LIKE] Notify error:', err.message)); 

    // Check mutual like
    const isMatch = await User.exists({ _id: target._id, likes: me._id });
    if (isMatch) {
      const score = await calculateCompatibilityML(target, me);
      const [u1, u2] = [me._id, target._id].sort((a, b) => a.toString().localeCompare(b.toString()));
      const match = await Match.findOneAndUpdate(
        { user1: u1, user2: u2 },
        { user1: u1, user2: u2, compatibilityScore: score, active: true },
        { upsert: true, new: true }
      );
      console.log(`[MATCH] New match created: ${match._id} between ${u1} and ${u2}`);
      await Chat.findOneAndUpdate(
        { matchId: match._id },
        { matchId: match._id, participants: [me._id, target._id] },
        { upsert: true }
      );

      // Notify both users about the match
      await Notification.insertMany([
        { userId: me._id,     fromUser: target._id, type: 'match', message: `You matched with ${target.name}! 🎉`, matchId: match._id },
        { userId: target._id, fromUser: me._id,     type: 'match', message: `You matched with ${me.name}! 🎉`,    matchId: match._id }
      ]).catch(() => {});

      const populatedMatch = await Match.findById(match._id)
        .populate('user1', 'name photos verified')
        .populate('user2', 'name photos verified');
      return res.json({ matched: true, match: populatedMatch, compatibilityScore: score });
    }
    res.json({ matched: false });
  } catch (err) {
    console.error('[LIKE] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /superlike/:targetId ────────────────────────────────────────────────
router.post('/superlike/:targetId', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const target = await User.findById(req.params.targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    console.log(`[SUPERLIKE] User ${me._id} super-liked ${target._id}`);
    // Super like counts as a regular like too
    await User.findByIdAndUpdate(me._id, { $addToSet: { likes: target._id } });

    // Notify target with superlike notification
    await Notification.create({
      userId:   target._id,
      fromUser: me._id,
      type:     'superlike',
      message:  `⭐ ${me.name} super liked you!`
    }).catch(err => console.error('[SUPERLIKE] Notify error:', err.message));

    // Check mutual like → create match
    const isMatch = await User.exists({ _id: target._id, likes: me._id });
    if (isMatch) {
      const score = await calculateCompatibilityML(target, me);
      const [u1, u2] = [me._id, target._id].sort((a, b) => a.toString().localeCompare(b.toString()));
      const match = await Match.findOneAndUpdate(
        { user1: u1, user2: u2 },
        { user1: u1, user2: u2, compatibilityScore: score, active: true },
        { upsert: true, new: true }
      );
      console.log(`[MATCH] New MATCH (via SuperLike) created: ${match._id} between ${u1} and ${u2}`);
      await Chat.findOneAndUpdate(
        { matchId: match._id },
        { matchId: match._id, participants: [me._id, target._id] },
        { upsert: true }
      );
      await Notification.insertMany([
        { userId: me._id,     fromUser: target._id, type: 'match', message: `You matched with ${target.name}! 🎉`, matchId: match._id },
        { userId: target._id, fromUser: me._id,     type: 'match', message: `You matched with ${me.name}! 🎉`,    matchId: match._id }
      ]).catch(err => console.error('[SUPERLIKE] Match Notify error:', err.message));

      const populatedMatch = await Match.findById(match._id)
        .populate('user1', 'name photos verified')
        .populate('user2', 'name photos verified');
      return res.json({ matched: true, match: populatedMatch, isSuperLike: true });
    }

    res.json({ matched: false, isSuperLike: true });
  } catch (err) {
    console.error('[SUPERLIKE] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /pass/:targetId ─────────────────────────────────────────────────────
router.post('/pass/:targetId', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const target = await User.findById(req.params.targetId);
    
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { passes: req.params.targetId } });
    
    if (me && target) {
      await updateDynamicWeights(me, target, 'pass').catch(err => console.error('[PASS] Weight update error:', err.message));
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /like/:targetId — remove a like (un-like) ────────────────────────
router.delete('/like/:targetId', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { likes: req.params.targetId },
      $addToSet: { passes: req.params.targetId }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /like/:targetId — remove a like (un-like / pass from Likes tab) ──
router.delete('/like/:targetId', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull:     { likes: req.params.targetId },
      $addToSet: { passes: req.params.targetId }
    });
    console.log(`[UNLIKE] User ${req.user._id} removed like for ${req.params.targetId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[UNLIKE] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /:matchId — remove/unmatch ───────────────────────────────────────
router.delete('/:matchId', protect, async (req, res) => {
  try {
    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });

    // Verify requester is a participant
    const isParticipant =
      match.user1.toString() === req.user._id.toString() ||
      match.user2.toString() === req.user._id.toString();
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    await Match.findByIdAndUpdate(req.params.matchId, { active: false });
    console.log(`[UNMATCH] Match ${req.params.matchId} deactivated by ${req.user._id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[UNMATCH] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET / (matches list) ─────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [{ user1: req.user._id }, { user2: req.user._id }],
      active: true
    })
      .populate('user1', 'name photos verified jobTitle interests')
      .populate('user2', 'name photos verified jobTitle interests')
      .sort({ createdAt: -1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
