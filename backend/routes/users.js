import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { calculateProfileScore } from '../utils/matchingEngine.js';

const router = express.Router();

// Update profile step
router.put('/profile', protect, async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select('-password');
    user.profileScore = calculateProfileScore(user);
    if (user.onboardingStep >= 9) user.profileComplete = true;
    await user.save();
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Full profile update (PUT /api/user/update)
router.put('/update', protect, async (req, res) => {
  console.log('[PROFILE UPDATE] body:', JSON.stringify(req.body, null, 2));
  try {
    const { name, jobTitle, education, lookingFor, interests, lifestyle, prompts, photos, location } = req.body;
    const updates = {};
    if (name)       updates.name = name;
    if (jobTitle !== undefined) updates.jobTitle = jobTitle;
    if (education !== undefined) updates.education = education;
    if (lookingFor) updates.lookingFor = lookingFor;
    if (interests)  updates.interests = interests;
    if (photos)     updates.photos = photos;
    if (prompts)    updates.prompts = prompts;
    if (lifestyle) {
      for (const k of Object.keys(lifestyle)) {
        updates[`lifestyle.${k}`] = lifestyle[k];
      }
    }
    if (location) {
      updates['location.city']    = location.city;
      updates['location.country'] = location.country;
      updates['location.type']    = 'Point';
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    user.profileScore = calculateProfileScore(user);
    await user.save();
    console.log('[PROFILE UPDATE] saved, score:', user.profileScore);
    res.json({ success: true, user });
  } catch (err) {
    console.error('[PROFILE UPDATE] error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Specific Onboarding Route (POST /api/user/onboarding)
router.post('/onboarding', protect, async (req, res) => {
  console.log('--- ONBOARDING DEBUG: REQUEST ---');
  console.log('Payload:', JSON.stringify(req.body, null, 2));
  
  try {
    const userId = req.user._id;
    const body = req.body;
    
    // Flatten the update object for nested fields (location, lifestyle)
    const updates = {};
    for (const key in body) {
      if (typeof body[key] === 'object' && body[key] !== null && !Array.isArray(body[key]) && !(body[key] instanceof Date)) {
        for (const subKey in body[key]) {
          updates[`${key}.${subKey}`] = body[key][subKey];
        }
      } else {
        updates[key] = body[key];
      }
    }

    // Ensure location.type is set if any location field is updated
    if (Object.keys(updates).some(k => k.startsWith('location.'))) {
      updates['location.type'] = 'Point';
      // If coordinates are missing, provide defaults to avoid index errors
      const user = await User.findById(userId);
      if (!user.location?.coordinates?.length && !updates['location.coordinates']) {
        updates['location.coordinates'] = [0, 0];
      }
    }

    delete updates.email;
    delete updates.password;

    console.log('--- ONBOARDING DEBUG: FLATTENED UPDATES ---', updates);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (typeof calculateProfileScore === 'function') {
        updatedUser.profileScore = calculateProfileScore(updatedUser);
    }

    if (updatedUser.onboardingStep >= 9) {
        updatedUser.profileComplete = true;
    }

    await updatedUser.save();

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error('--- ONBOARDING DEBUG: ERROR ---', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get user profile (tracks profile views)
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -blockedUsers -passes');
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Track profile view (don't count self-views)
    if (req.params.id !== req.user._id.toString()) {
      User.findByIdAndUpdate(req.params.id, { $inc: { profileViews: 1 } }).catch(() => {});
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Report user
router.post('/:id/report', protect, async (req, res) => {
  try {
    const { reason, details } = req.body;
    const Report = (await import('../models/Report.js')).default;
    await Report.create({ reporter: req.user._id, reported: req.params.id, reason, details });
    res.json({ message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Block user
router.post('/:id/block', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: req.params.id } });
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify selfie (mark verified)
router.post('/verify', protect, async (req, res) => {
  try {
    const { verificationPhoto } = req.body;
    await User.findByIdAndUpdate(req.user._id, { verified: true, verificationPhoto });
    res.json({ message: 'Verified', verified: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
