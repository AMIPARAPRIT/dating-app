import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  user1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  compatibilityScore: { type: Number, default: 0 },
  matchedAt: { type: Date, default: Date.now },
  isSuperLike: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

matchSchema.index({ user1: 1, user2: 1 }, { unique: true });

export default mongoose.model('Match', matchSchema);
