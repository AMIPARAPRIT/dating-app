import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { calculateProfileScore } from '../utils/matchingEngine.js';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production_123!';

const signToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });

// Fields to always return (never send password)
const USER_FIELDS = '-password';

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);

    // Return full user so frontend doesn't need a separate fetchMe
    const fullUser = await User.findById(user._id).select(USER_FIELDS);
    console.log('[REGISTER] New user:', fullUser.email);
    res.status(201).json({ token, user: fullUser });
  } catch (err) {
    console.error('[REGISTER] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.password)
      return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    user.lastActive = Date.now();
    await user.save();

    const token = signToken(user._id);

    // Return full user — all profile data restored on login
    const fullUser = await User.findById(user._id).select(USER_FIELDS);
    console.log('[LOGIN] User logged in:', fullUser.email, '| profileComplete:', fullUser.profileComplete);
    res.json({ token, user: fullUser });
  } catch (err) {
    console.error('[LOGIN] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    let payload;

    if (process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id' &&
        process.env.GOOGLE_CLIENT_ID !== '') {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      payload = ticket.getPayload();
    } else {
      // Mock for dev without Google credentials
      payload = {
        sub: `mock-${Date.now()}`,
        email: `mock.${Date.now()}@example.com`,
        name: 'Google User',
        picture: ''
      };
    }

    const { sub, email, name, picture } = payload;
    let user = await User.findOne({ $or: [{ googleId: sub }, { email }] });

    if (!user) {
      user = await User.create({
        name, email, googleId: sub,
        photos: picture ? [picture] : []
      });
    } else if (!user.googleId) {
      user.googleId = sub;
      await user.save();
    }

    const token = signToken(user._id);
    const fullUser = await User.findById(user._id).select(USER_FIELDS);
    res.json({ token, user: fullUser });
  } catch (err) {
    console.error('[GOOGLE AUTH] Error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── Get current user (session restore) ───────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  // Return fresh full user from DB (not cached req.user)
  try {
    const user = await User.findById(req.user._id).select(USER_FIELDS);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Recalculate score with latest logic on every session restore
    const fresh = calculateProfileScore(user);
    if (fresh !== user.profileScore) {
      user.profileScore = fresh;
      await user.save();
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
