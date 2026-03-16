const mongoose = require('mongoose');

const generationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['hook', 'title', 'script', 'ideas', 'hook_analysis', 'reel_analysis', 'script_analysis', 'trending', 'caption', 'viral_score', 'improve_caption', 'video_viral_score', 'hashtags', 'profile_analysis', 'full_post']

  },
  input: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  output: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  platform: {
    type: String,
    enum: ['youtube', 'instagram', 'tiktok', 'general'],
    default: 'general'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexing for performance and scalability
generationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Generation', generationSchema);
