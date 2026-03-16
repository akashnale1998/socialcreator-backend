const mongoose = require('mongoose');

const demoUsageSchema = new mongoose.Schema({
  demoId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  requestCount: {
    type: Number,
    default: 0,
  },
  featureUsage: {
    caption: { type: Number, default: 0 },
    hashtags: { type: Number, default: 0 },
    viralScore: { type: Number, default: 0 },
    ideas: { type: Number, default: 0 },
    hook: { type: Number, default: 0 },
    title: { type: Number, default: 0 }
  },
  lastUsedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DemoUsage', demoUsageSchema);
