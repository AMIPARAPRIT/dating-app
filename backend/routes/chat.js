import express from 'express';
import Chat from '../models/Chat.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { generateConversationStarters } from '../utils/matchingEngine.js';
import { getIo } from '../utils/ioInstance.js';

const router = express.Router();

// ── AI auto-reply generator ──────────────────────────────────────────────────
function generateAIReply(message, profile) {
  const msg = (message || '').toLowerCase();
  const interests = profile?.interests || [];
  const prompts = profile?.prompts || [];

  const has = (words) => words.some(w => msg.includes(w));

  if (has(['hi','hey','hello','sup','yo','hiya','hii']) && msg.length < 20)
    return ['Hey! 😊 How are you doing?', 'Hi there! 👋 Nice to hear from you!', 'Hello! 🌟 How\'s your day going?'][Math.floor(Math.random()*3)];

  if (has(['how are you','how r u','how\'s it going','how do you do']))
    return `I'm doing great, thanks! 😄 What about you?`;

  if (has(['travel','trip','vacation','visit','abroad','flight'])) {
    const places = ['Bali','Tokyo','Paris','Barcelona','Santorini'];
    return `${interests.includes('Travel') ? "I love traveling too! " : ""}${places[Math.floor(Math.random()*places.length)]} is on my bucket list! Where would you recommend? ✈️`;
  }

  if (has(['food','eat','cook','restaurant','dinner','lunch','breakfast','coffee']))
    return `${interests.includes('Cooking') ? "I love cooking! " : ""}Food is life honestly 😄 What's your go-to comfort meal?`;

  if (has(['music','song','playlist','concert','band','artist','listen']))
    return `${interests.includes('Music') ? "Music is my therapy! " : ""}What kind of music are you into? Always looking for recs 🎵`;

  if (has(['gym','workout','fitness','run','exercise','sport','yoga','hike']))
    return `${interests.includes('Fitness') ? "Fitness is a big part of my life! " : ""}That's awesome! Do you prefer solo or group workouts? 💪`;

  if (has(['movie','film','watch','netflix','series','show','cinema']))
    return `${interests.includes('Movies') ? "I'm a huge movie buff! " : ""}What genre are you into? I need a good rec 🎬`;

  if (has(['weekend','saturday','sunday','free time','plans'])) {
    const prompt = prompts[0]?.answer;
    return prompt ? `My ideal weekend? ${prompt} What about you? 😊` : `A mix of adventure and chill time is perfect for me. What do you usually do? 🌅`;
  }

  if (has(['cute','beautiful','handsome','pretty','attractive','nice','cool','awesome']))
    return ['Aww, that\'s so sweet! 😊 You seem really fun to talk to!', 'Haha thank you! 😄 You\'re pretty great yourself!'][Math.floor(Math.random()*2)];

  if (has(['?','what','how','where','when','why','do you','are you','have you'])) {
    if (interests.length > 0) {
      const interest = interests[Math.floor(Math.random() * interests.length)];
      return `Great question! I'd say ${interest.toLowerCase()} is a big part of who I am. What about you? 😊`;
    }
    return `That's a great question! I'd love to tell you more. What made you curious? 😄`;
  }

  const defaults = [
    `That's really interesting! Tell me more 😊`,
    `Haha I love that! We should definitely talk more 😄`,
    `Oh wow, I feel the same way! What else are you into? ✨`,
    `You seem like a really interesting person! What's your story? 😊`,
  ];
  if (interests.length > 0)
    defaults.push(`By the way, I noticed you're into ${interests[Math.floor(Math.random()*interests.length)].toLowerCase()} — same here! 🎉`);
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ── Helper: resolve chat by matchId (supports both real matchId and like_* virtual IDs) ──
async function resolveChat(matchId, userId) {
  if (matchId.startsWith('like_')) {
    return Chat.findOne({ 'meta.virtualId': matchId });
  }
  return Chat.findOne({ matchId });
}

// ─── GET /conversations — list all chats for current user ────────────────────
router.get('/conversations', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'name photos verified jobTitle isDemo')
      .sort({ lastMessage: -1, updatedAt: -1 })
      .lean();

    const result = chats.map(chat => {
      const other = chat.participants.find(p => p._id.toString() !== req.user._id.toString());
      const msgs = chat.messages || [];
      const lastMsg = msgs[msgs.length - 1] || null;
      const unread = msgs.filter(m =>
        m.sender.toString() !== req.user._id.toString() && !m.read
      ).length;
      return {
        _id: chat._id,
        matchId: chat.matchId,
        virtualId: chat.meta?.virtualId || null,
        other,
        lastMessage: lastMsg ? { content: lastMsg.content, type: lastMsg.type, createdAt: lastMsg.createdAt } : null,
        unreadCount: unread,
        updatedAt: chat.lastMessage || chat.updatedAt
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[CONVERSATIONS]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /:matchId — fetch chat (real match or like-based virtual chat) ───────
router.get('/:matchId', protect, async (req, res) => {
  try {
    const { matchId } = req.params;

    // Virtual like-chat
    if (matchId.startsWith('like_')) {
      const parts = matchId.replace('like_', '').split('_');
      const otherId = parts.find(id => id !== req.user._id.toString());
      const me = await User.findById(req.user._id).select('likes').lean();
      const hasLiked = (me.likes || []).some(id => id.toString() === otherId);
      if (!hasLiked) return res.status(403).json({ message: 'You must like this person to chat' });

      let chat = await Chat.findOne({ 'meta.virtualId': matchId })
        .populate('participants', 'name photos verified jobTitle interests prompts isDemo');
      if (!chat) {
        const other = await User.findById(otherId).select('_id').lean();
        if (!other) return res.status(404).json({ message: 'User not found' });
        // Create a placeholder match so Chat.matchId ref is valid
        const [u1, u2] = [req.user._id.toString(), otherId].sort();
        const fakeMatch = await Match.findOneAndUpdate(
          { user1: u1, user2: u2 },
          { user1: u1, user2: u2, compatibilityScore: 0, active: false },
          { upsert: true, new: true }
        );
        chat = await Chat.create({
          matchId: fakeMatch._id,
          participants: [req.user._id, otherId],
          messages: [],
          meta: { virtualId: matchId, isLikedChat: true }
        });
        await chat.populate('participants', 'name photos verified jobTitle interests prompts isDemo');
      }
      return res.json(chat);
    }

    // Normal match-based chat
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    const isParticipant =
      match.user1.toString() === req.user._id.toString() ||
      match.user2.toString() === req.user._id.toString();
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    let chat = await Chat.findOneAndUpdate(
      { matchId },
      { $setOnInsert: { matchId, participants: [match.user1, match.user2], messages: [] } },
      { upsert: true, new: true }
    ).populate('participants', 'name photos verified jobTitle interests prompts isDemo');

    res.json(chat);
  } catch (err) {
    console.error('[CHAT GET]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /:matchId/message — send message + AI auto-reply for demo users ─────
router.post('/:matchId/message', protect, async (req, res) => {
  try {
    const { content, type, mediaUrl } = req.body;
    if (!content && !mediaUrl) return res.status(400).json({ message: 'Message content required' });

    const { matchId } = req.params;
    const message = {
      sender: req.user._id,
      content: content || '',
      type: type || 'text',
      mediaUrl: mediaUrl || null,
      createdAt: new Date()
    };

    const chatQuery = matchId.startsWith('like_')
      ? { 'meta.virtualId': matchId }
      : { matchId };

    const chat = await Chat.findOneAndUpdate(
      chatQuery,
      { $push: { messages: message }, lastMessage: Date.now() },
      { new: true }
    ).populate('messages.sender', 'name photos')
     .populate('participants', 'name photos interests prompts isDemo');

    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const saved = chat.messages[chat.messages.length - 1];
    console.log('[CHAT MSG]', req.user._id, '->', matchId, ':', content?.slice(0, 30));

    // AI auto-reply if the other participant is a demo user
    const other = chat.participants?.find(p => p._id?.toString() !== req.user._id.toString());
    if (other?.isDemo && content) {
      const typingDelay = 800  + Math.random() * 700;
      const replyDelay  = 1800 + Math.random() * 1400;
      const room = matchId.startsWith('like_') ? `like:${matchId}` : `match:${matchId}`;

      setTimeout(async () => {
        try {
          const io = getIo();
          if (io) io.to(room).emit('chat:typing', { userId: other._id.toString(), isTyping: true });
        } catch (e) { console.error('[AI TYPING REST]', e.message); }
      }, typingDelay);

      setTimeout(async () => {
        try {
          const reply = generateAIReply(content, other);
          const replyMsg = { sender: other._id, content: reply, type: 'text', createdAt: new Date() };
          await Chat.findOneAndUpdate(
            chatQuery,
            { $push: { messages: replyMsg }, lastMessage: Date.now() }
          );
          const io = getIo();
          if (io) {
            io.to(room).emit('chat:typing', { userId: other._id.toString(), isTyping: false });
            io.to(room).emit('chat:message', { ...replyMsg, sender: other._id.toString(), matchId });
          }
          console.log(`[AI REPLY REST] ${other.name} → "${reply.slice(0, 40)}…"`);
        } catch (e) { console.error('[AI REPLY REST]', e.message); }
      }, replyDelay);
    }

    res.json(saved);
  } catch (err) {
    console.error('[CHAT MSG]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /:matchId/starters ───────────────────────────────────────────────────
router.get('/:matchId/starters', protect, async (req, res) => {
  try {
    const { matchId } = req.params;
    if (matchId.startsWith('like_')) {
      const parts = matchId.replace('like_', '').split('_');
      const otherId = parts.find(id => id !== req.user._id.toString());
      const other = await User.findById(otherId).lean();
      return res.json({ starters: generateConversationStarters(req.user, other || {}) });
    }
    const match = await Match.findById(matchId).populate('user1 user2');
    if (!match) return res.json({ starters: ["What's your favorite thing to do on weekends?", "If you could travel anywhere, where would you go?", "What's something you're passionate about?"] });
    const other = match.user1._id.toString() === req.user._id.toString() ? match.user2 : match.user1;
    res.json({ starters: generateConversationStarters(req.user, other) });
  } catch (err) {
    console.error('[STARTERS]', err.message);
    res.json({ starters: ["What's your favorite thing to do on weekends?", "If you could travel anywhere, where would you go?", "What's something you're passionate about?"] });
  }
});

export default router;
