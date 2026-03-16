/**
 * Centralized configuration for AI tool costs, plan limits, and feature access.
 */

const CREDIT_COSTS = {
  'generate-hook': 1,
  'analyze-hook': 1,
  'generate-title': 1,
  'analyze-script': 1,
  'generate-ideas': 1,
  'analyze-reel': 1,
  'generate-script': 1,
  'generate-caption': 1,
  'analyze-viral-score': 1,
  'improve-caption': 1,
  'analyze-video-viral-score': 3,
  'generate-hashtags': 1,
  'analyze-profile': 2,
  'daily-viral-ideas': 1,
  'trending': 1
};

const PLANS = {
  'free': {
    name: 'Free Starter',
    dailyLimit: 10,
    hourlyLimit: 5,
    features: ['hooks', 'titles', 'ideas', 'captions', 'hashtags', 'viral-score']
  },
  'creator': {
    name: 'Pro Creator',
    monthlyLimit: 500,
    hourlyLimit: 50,
    features: ['hooks', 'titles', 'ideas', 'captions', 'hashtags', 'viral-score', 'script-analyzer', 'profile-analyzer', 'reel-analyzer']
  },
  'pro': {
    name: 'Agency Pro',
    monthlyLimit: 1500,
    hourlyLimit: 200,
    features: ['hooks', 'titles', 'ideas', 'captions', 'hashtags', 'viral-score', 'script-analyzer', 'profile-analyzer', 'reel-analyzer', 'trending']
  },
  'lifetime': {
    name: 'Gold Lifetime',
    monthlyLimit: 2000,
    hourlyLimit: 500,
    features: ['hooks', 'titles', 'ideas', 'captions', 'hashtags', 'viral-score', 'script-analyzer', 'profile-analyzer', 'reel-analyzer', 'trending']
  }
};

module.exports = {
  CREDIT_COSTS,
  PLANS
};
