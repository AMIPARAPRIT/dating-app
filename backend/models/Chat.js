import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String },
  type: { type: String, enum: ['text', 'image', 'voice'], default: 'text' },
  mediaUrl: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [messageSchema],
  lastMessage: Date,
  aiStarters: [String],
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Index on meta.virtualId for fast like-chat lookups
chatSchema.index({ 'meta.virtualId': 1 }, { sparse: true });
// Unique per real match (only when no virtualId)
chatSchema.index({ matchId: 1, 'meta.virtualId': 1 });

export default mongoose.model('Chat', chatSchema);
