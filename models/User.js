const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    minlength: 6,
    select: false
  },
  googleId: { type: String, unique: true, sparse: true },
  githubId: { type: String, unique: true, sparse: true },
  twitterId: { type: String, unique: true, sparse: true },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'banned'],
    default: 'active'
  },
  // --- PRICING & CREDITS ---
  plan: {
    type: String,
    enum: ['free', 'creator', 'pro', 'lifetime'],
    default: 'free'
  },
  credits_remaining: {
    type: Number,
    default: 10
  },
  is_lifetime_user: {
    type: Boolean,
    default: false
  },
  // --- REFERRAL SYSTEM ---
  referral_code: {
    type: String,
    unique: true,
    sparse: true
  },
  referred_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referrals_count: {
    type: Number,
    default: 0
  },
  earned_credits: {
    type: Number,
    default: 0
  },
  lastCreditReset: {
    type: Date,
    default: Date.now
  },
  lastAiRequestAt: {
    type: Date,
    default: null
  },
  // --- ABUSE PROTECTION ---
  hourlyAiRequests: {
    count: { type: Number, default: 0 },
    resetAt: { type: Date, default: Date.now }
  },
  burstRequests: {
    count: { type: Number, default: 0 },
    windowStart: { type: Date, default: Date.now }
  },
  rateLimitTriggers: {
    type: Number,
    default: 0
  },
  isSuspicious: {
    type: Boolean,
    default: false
  },
  blockExpiresAt: {
    type: Date,
    default: null
  },
  firstAiRequestDone: {
    type: Boolean,
    default: false
  },
  // -------------------------
  is_verified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
