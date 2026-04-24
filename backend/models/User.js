import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },
  googleId: { type: String },
  gender: { type: String, enum: ['male', 'female', 'non-binary', 'other'] },
  interestedIn: [{ type: String }],
  dob: { type: Date },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: [Number],
    city: String,
    country: String
  },
  height: Number,
  bodyType: String,
  education: String,
  jobTitle: String,
  lookingFor: { type: String, enum: ['serious', 'casual', 'friendship'] },
  interests: [String],
  lifestyle: {
    schedule: { type: String, enum: ['morning', 'night'] },
    personality: { type: String, enum: ['introvert', 'extrovert'] },
    smoking: { type: String, enum: ['never', 'sometimes', 'often'] },
    drinking: { type: String, enum: ['never', 'sometimes', 'often'] },
    workout: { type: String, enum: ['never', 'sometimes', 'often'] }
  },
  prompts: [{
    question: String,
    answer: String
  }],
  photos: [String],
  video: String,
  verified: { type: Boolean, default: false },
  verificationPhoto: String,
  profileScore: { type: Number, default: 0 },
  profileComplete: { type: Boolean, default: false },
  onboardingStep: { type: Number, default: 0 },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  superLikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  passes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDemo: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  profileViews: { type: Number, default: 0 },
  agePreference: { min: { type: Number, default: 18 }, max: { type: Number, default: 50 } },
  distancePreference: { type: Number, default: 50 },
  preferences: {
    interestWeight: { type: Number, default: 40 },
    intentWeight: { type: Number, default: 20 },
    lifestyleWeight: { type: Number, default: 20 },
    ageWeight: { type: Number, default: 10 },
    profileWeight: { type: Number, default: 10 }
  }
}, { timestamps: true });

userSchema.index({ location: '2dsphere' }, { sparse: true });
userSchema.index({ dob: 1 });
userSchema.index({ interests: 1 });
userSchema.index({ lookingFor: 1 });
userSchema.index({ profileComplete: 1, gender: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual('age').get(function () {
  if (!this.dob) return null;
  return Math.floor((Date.now() - this.dob) / (365.25 * 24 * 60 * 60 * 1000));
});

export default mongoose.model('User', userSchema);
