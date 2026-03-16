const DemoUsage = require('../models/DemoUsage');

/**
 * Apply Demo Limits for unauthenticated users
 */
const applyDemoLimits = async (req, res, next) => {
  // If user is authenticated, skip demo limits
  if (req.user) {
    req.isDemo = false;
    return next();
  }

  req.isDemo = true;
  const demoId = req.headers['x-demo-id'];
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!demoId) {
    return res.status(400).json({ error: 'Missing demo ID. Please refresh the page.' });
  }

  try {
    let usage = await DemoUsage.findOne({ demoId });

    if (!usage) {
      usage = new DemoUsage({ demoId, ipAddress });
    }

    const now = new Date();
    // Check if limits need reset (older than 24 hours)
    if (now - usage.lastUsedAt > 24 * 60 * 60 * 1000) {
      usage.requestCount = 0;
      usage.featureUsage = { caption: 0, hashtags: 0, viralScore: 0, ideas: 0, hook: 0, title: 0 };
    }

    // Define Feature specific limits mapping
    const limits = {
      'generate-caption': { key: 'caption', max: 2 },
      'analyze-video-viral-score': { key: 'viralScore', max: 1 },
      'generate-hashtags': { key: 'hashtags', max: 1 },
      'generate-ideas': { key: 'ideas', max: 2 },
      'generate-hook': { key: 'hook', max: 2 },
      'generate-title': { key: 'title', max: 2 }
    };

    // Determine current feature from the URL
    // URL looks like /api/ai/generate-caption
    const pathParts = req.originalUrl.split('?')[0].split('/');
    const endpoint = pathParts[pathParts.length - 1];

    // MAX OVERALL DEMO LIMIT = 3
    if (usage.requestCount >= 3) {
      return res.status(429).json({ 
        error: 'Demo limit reached. Create a free account to continue generating viral content.',
        isDemoLimit: true
      });
    }

    const featureConfig = limits[endpoint];
    if (featureConfig) {
      const currentUsage = usage.featureUsage[featureConfig.key] || 0;
      if (currentUsage >= featureConfig.max) {
        return res.status(429).json({ 
          error: `Demo limit reached for this specific tool. Create a free account to continue.`,
          isDemoFeatureLimit: true
        });
      }
      
      // Increment the specific feature usage and total count
      usage.featureUsage[featureConfig.key] += 1;
    }

    // Always increment total count to reflect some AI action was done as demo
    usage.requestCount += 1;
    usage.lastUsedAt = now;
    // Update IP in case it changed
    usage.ipAddress = ipAddress;
    
    await usage.save();

    next();
  } catch (error) {
    console.error('Demo limit error:', error.message);
    return res.status(500).json({ error: 'Server error verifying demo limits.' });
  }
};

module.exports = { applyDemoLimits };
