import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type:     { type: String, enum: ['like', 'match', 'superlike', 'message'], required: true },
  message:  { type: String, required: true },
  isRead:   { type: Boolean, default: false },
  matchId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
