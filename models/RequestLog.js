const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['allowed', 'blocked', 'rate_limited'],
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  platform: {
    type: String,
    default: 'web'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // Automatically clean up logs after 30 days
  }
});

module.exports = mongoose.model('RequestLog', requestLogSchema);
