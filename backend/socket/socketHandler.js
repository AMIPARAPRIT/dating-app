import Chat from '../models/Chat.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const onlineUsers = new Map(); // userId -> socketId

// ── AI reply engine (mirrors chat route logic, extended) ──────────────────────
function generateAIReply(message, profile) {
  const msg = (message || '').toLowerCase().trim();
  const interests = profile?.interests || [];
  const prompts   = profile?.prompts   || [];
  const has = (words) => words.some(w => msg.includes(w));

  // Greetings
  if (has(['hi','hey','hello','sup','yo','hiya','hii','howdy']) && msg.length < 25)
    return ['Hey! 😊 How are you doing?', 'Hi there! 👋 So nice to hear from you!', 'Hello! 🌟 How\'s your day going?'][Math.floor(Math.random()*3)];

  // How are you
  if (has(['how are you','how r u','how\'s it going','how do you do','you good','u good']))
    return `I'm doing great, thanks for asking! 😄 What about you?`;

  // Travel
  if (has(['travel','trip','vacation','visit','abroad','flight','passport','backpack'])) {
    const places = ['Bali','Tokyo','Paris','Barcelona','Santorini','New York','Kyoto'];
    const place = places[Math.floor(Math.random()*places.length)];
    return `${interests.includes('Travel') ? 'I love traveling too! ' : ''}${place} is on my bucket list! Where would you recommend? ✈️`;
  }

  // Food
  if (has(['food','eat','cook','restaurant','dinner','lunch','breakfast','coffee','pizza','sushi','burger']))
    return `${interests.includes('Cooking') ? 'I love cooking! ' : ''}Food is literally life 😄 What's your go-to comfort meal?`;

  // Music
  if (has(['music','song','playlist','concert','band','artist','listen','spotify','album']))
    return `${interests.includes('Music') ? 'Music is my therapy! ' : ''}What kind of music are you into? Always looking for new recs 🎵`;

  // Fitness
  if (has(['gym','workout','fitness','run','exercise','sport','yoga','hike','cycling','swim']))
    return `${interests.includes('Fitness') ? 'Fitness is a big part of my life! ' : ''}That's awesome! Do you prefer solo or group workouts? 💪`;

  // Movies / shows
  if (has(['movie','film','watch','netflix','series','show','cinema','binge','episode']))
    return `${interests.includes('Movies') ? "I'm a huge movie buff! " : ''}What genre are you into? I need a good rec 🎬`;

  // Gaming
  if (has(['game','gaming','play','ps5','xbox','pc','steam','valorant','minecraft','fortnite']))
    return `${interests.includes('Gaming') ? 'Gamer here too! ' : ''}Nice! What are you playing lately? 🎮`;

  // Weekend / plans
  if (has(['weekend','saturday','sunday','free time','plans','tonight','today'])) {
    const prompt = prompts[0]?.answer;
    return prompt
      ? `My ideal weekend? ${prompt} What about you? 😊`
      : `A mix of adventure and chill time is perfect for me. What do you usually do? 🌅`;
  }

  // Compliments
  if (has(['cute','beautiful','handsome','pretty','attractive','gorgeous','lovely','stunning']))
    return ['Aww, that\'s so sweet! 😊 You seem really fun to talk to!', 'Haha thank you! 😄 You\'re pretty great yourself!'][Math.floor(Math.random()*2)];

  // Questions
  if (has(['?','what','how','where','when','why','do you','are you','have you','tell me','would you'])) {
    if (interests.length > 0) {
      const interest = interests[Math.floor(Math.random() * interests.length)];
      return `Great question! I'd say ${interest.toLowerCase()} is a big part of who I am. What about you? 😊`;
    }
    return `That's a great question! I'd love to tell you more. What made you curious? 😄`;
  }

  // Defaults — pick one that references an interest if possible
  const defaults = [
    `That's really interesting! Tell me more 😊`,
    `Haha I love that! We should definitely talk more 😄`,
    `Oh wow, I feel the same way! What else are you into? ✨`,
    `You seem like a really interesting person! What's your story? 😊`,
    `Honestly same 😂 What got you into that?`,
  ];
  if (interests.length > 0)
    defaults.push(`By the way, I noticed you're into ${interests[Math.floor(Math.random()*interests.length)].toLowerCase()} — same here! 🎉`);
  return defaults[Math.floor(Math.random() * defaults.length)];
}

export function setupSocket(io) {
  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    onlineUsers.set(socket.userId, socket.id);
    io.emit('user:online', { userId: socket.userId });

    // Join match room (supports both real matchId and like_* virtual IDs)
    socket.on('chat:join', (matchId) => {
      const room = String(matchId).startsWith('like_') ? `like:${matchId}` : `match:${matchId}`;
      socket.join(room);
      console.log(`[SOCKET] User ${socket.userId} joined room ${room}`);
    });

    // ── Send message — save to DB, broadcast, then AI reply if demo ──────────
    socket.on('chat:message', async (data) => {
      const { matchId, content, type, mediaUrl, _tempId } = data;
      try {
        const message = {
          sender: socket.userId,
          content: content || '',
          type: type || 'text',
          mediaUrl: mediaUrl || null,
          createdAt: new Date()
        };

        const isLikeChat = String(matchId).startsWith('like_');
        const chatQuery  = isLikeChat ? { 'meta.virtualId': matchId } : { matchId };
        const room       = isLikeChat ? `like:${matchId}` : `match:${matchId}`;

        // Save to DB
        const chat = await Chat.findOneAndUpdate(
          chatQuery,
          { $push: { messages: message }, lastMessage: Date.now() },
          { new: true }
        ).populate('participants', 'name photos interests prompts isDemo');

        // Broadcast to room (include _tempId so sender can confirm optimistic msg)
        io.to(room).emit('chat:message', { ...message, sender: socket.userId, matchId, _tempId });

        // ── AI auto-reply for demo users ──────────────────────────────────────
        if (!chat || !content) return;
        const other = chat.participants?.find(p => p._id?.toString() !== socket.userId.toString());
        if (!other?.isDemo) return;

        const typingDelay = 800  + Math.random() * 700;   // show typing after ~1s
        const replyDelay  = 1800 + Math.random() * 1400;  // send reply after ~2-3s

        // 1. Emit typing indicator after short delay
        setTimeout(() => {
          io.to(room).emit('chat:typing', { userId: other._id.toString(), isTyping: true });
          console.log(`[AI TYPING] ${other.name} is typing in ${room}`);
        }, typingDelay);

        // 2. Send reply and clear typing
        setTimeout(async () => {
          try {
            const reply = generateAIReply(content, other);
            const replyMsg = {
              sender: other._id,
              content: reply,
              type: 'text',
              createdAt: new Date()
            };

            await Chat.findOneAndUpdate(
              chatQuery,
              { $push: { messages: replyMsg }, lastMessage: Date.now() }
            );

            // Stop typing indicator
            io.to(room).emit('chat:typing', { userId: other._id.toString(), isTyping: false });
            // Deliver reply
            io.to(room).emit('chat:message', { ...replyMsg, sender: other._id.toString(), matchId });

            console.log(`[AI REPLY] ${other.name} → "${reply.slice(0, 40)}…"`);
          } catch (e) {
            console.error('[AI REPLY] Error:', e.message);
          }
        }, replyDelay);

      } catch (err) {
        console.error('[SOCKET MSG]', err.message);
        socket.emit('chat:error', { message: err.message });
      }
    });

    // Typing indicator (from real user)
    socket.on('chat:typing', ({ matchId, isTyping }) => {
      const room = String(matchId).startsWith('like_') ? `like:${matchId}` : `match:${matchId}`;
      socket.to(room).emit('chat:typing', { userId: socket.userId, isTyping });
    });

    // Mark messages read
    socket.on('chat:read', async ({ matchId }) => {
      const isLikeChat = String(matchId).startsWith('like_');
      const chatQuery  = isLikeChat ? { 'meta.virtualId': matchId } : { matchId };
      await Chat.updateOne(
        chatQuery,
        { $set: { 'messages.$[elem].read': true } },
        { arrayFilters: [{ 'elem.sender': { $ne: socket.userId } }] }
      );
      const room = isLikeChat ? `like:${matchId}` : `match:${matchId}`;
      socket.to(room).emit('chat:read', { userId: socket.userId });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.userId);
      io.emit('user:offline', { userId: socket.userId });
      User.findByIdAndUpdate(socket.userId, { lastActive: Date.now() }).exec();
    });
  });
}

export { onlineUsers };
