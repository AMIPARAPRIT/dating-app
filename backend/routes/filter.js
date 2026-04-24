import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { calculateCompatibility, calculateCompatibilityML } from '../utils/matchingEngine.js';

const router = express.Router();

/**
 * GET /api/users/filter
 * Accepts: ageMin, ageMax, heightMin, heightMax, distance,
 *          gender, interests (comma-sep),
 *          lifestyle_smoking, lifestyle_drinking,
 *          lifestyle_workout, lifestyle_schedule,
 *          intent, page, limit
 */
router.get('/filter', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).lean();
    if (!me) return res.status(404).json({ message: 'User not found' });

    const excluded = new Set([
      ...(me.likes || []).map(id => id.toString()),
      ...(me.passes || []).map(id => id.toString()),
      ...(me.blockedUsers || []).map(id => id.toString()),
      me._id.toString()
    ]);

    const {
      ageMin, ageMax,
      heightMin, heightMax,
      distance,
      gender, interests,
      lifestyle_smoking, lifestyle_drinking,
      lifestyle_workout, lifestyle_schedule,
      intent,
      page = 0, limit = 20
    } = req.query;

    const query = {
      _id: { $nin: [...excluded] },
      profileComplete: true,
    };

    // ── Age filter (DOB range) — only apply when explicitly provided ──────────
    const parsedAgeMin = ageMin ? Number(ageMin) : null;
    const parsedAgeMax = ageMax ? Number(ageMax) : null;
    const isDefaultAge = parsedAgeMin === 18 && parsedAgeMax === 50;

    if (parsedAgeMin !== null && parsedAgeMax !== null && !isDefaultAge) {
      const now = new Date();
      // Users born between (now - ageMax years) and (now - ageMin years)
      const dobMin = new Date(now.getFullYear() - parsedAgeMax, now.getMonth(), now.getDate());
      const dobMax = new Date(now.getFullYear() - parsedAgeMin, now.getMonth(), now.getDate());
      // Use $or so users without dob still appear when age is near-default
      query.$or = [
        { dob: { $gte: dobMin, $lte: dobMax } },
        { dob: { $exists: false } },
        { dob: null }
      ];
    }

    // ── Gender — explicit filter overrides user preference ────────────────────
    if (gender && gender !== '' && gender.toLowerCase() !== 'any') {
      query.gender = { $in: gender.split(',').map(g => g.trim().toLowerCase()).filter(Boolean) };
    } else if (me.interestedIn?.length > 0 && !me.interestedIn.includes('everyone')) {
      query.gender = { $in: me.interestedIn.map(g => g.toLowerCase()) };
    }

    // ── Height ────────────────────────────────────────────────────────────────
    if (heightMin || heightMax) {
      query.height = {};
      if (heightMin) query.height.$gte = Number(heightMin);
      if (heightMax) query.height.$lte = Number(heightMax);
    }

    // ── Interests (OR match — at least one shared interest) ───────────────────
    if (interests && interests !== '' && interests !== 'null') {
      const arr = interests.split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) query.interests = { $in: arr };
    }

    // ── Intent (lookingFor) ───────────────────────────────────────────────────
    if (intent && intent !== '' && intent.toLowerCase() !== 'any') {
      query.lookingFor = intent;
    }

    // ── Lifestyle ─────────────────────────────────────────────────────────────
    if (lifestyle_smoking)  query['lifestyle.smoking']  = lifestyle_smoking;
    if (lifestyle_drinking) query['lifestyle.drinking'] = lifestyle_drinking;
    if (lifestyle_workout)  query['lifestyle.workout']  = lifestyle_workout;
    if (lifestyle_schedule) query['lifestyle.schedule'] = lifestyle_schedule;

    // ── Geospatial — only apply when user has real coordinates AND distance is set ──
    const coords = me.location?.coordinates;
    const hasRealCoords = coords?.length === 2 && (coords[0] !== 0 || coords[1] !== 0);
    const parsedDistance = distance ? Number(distance) : null;

    let useGeo = false;
    if (hasRealCoords && parsedDistance && parsedDistance < 200) {
      try {
        query.location = {
          $near: {
            $geometry: { type: 'Point', coordinates: coords },
            $maxDistance: parsedDistance * 1000
          }
        };
        useGeo = true;
      } catch {
        // geo index not ready — skip distance filter
      }
    }

    console.log('[FILTER] query:', JSON.stringify({ ...query, _id: '[excluded]' }));

    const skip = Number(page) * Number(limit);

    let raw;
    try {
      raw = await User.find(query)
        .skip(skip)
        .limit(Number(limit) + 1)
        .select('-password -blockedUsers -passes -likes')
        .lean();
    } catch (geoErr) {
      // $near can fail if 2dsphere index isn't ready — retry without geo
      if (useGeo) {
        console.warn('[FILTER] Geo query failed, retrying without distance:', geoErr.message);
        delete query.location;
        raw = await User.find(query)
          .skip(skip)
          .limit(Number(limit) + 1)
          .select('-password -blockedUsers -passes -likes')
          .lean();
      } else {
        throw geoErr;
      }
    }

    const hasMore = raw.length > Number(limit);
    const results = raw.slice(0, Number(limit));

    // Score + sort by compatibility using ML API
    const scored = await Promise.all(results.map(async c => {
      const mlScore = await calculateCompatibilityML(c, me);
      return { ...c, compatibilityScore: mlScore };
    }));
    
    scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    console.log(`[FILTER] Returning ${scored.length} results (hasMore: ${hasMore})`);
    res.json({ results: scored, hasMore, total: scored.length, page: Number(page) });
  } catch (err) {
    console.error('[FILTER] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
