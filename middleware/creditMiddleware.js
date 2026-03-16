const User = require('../models/User');

/**
 * Middleware to handle credit checks, resets, and rate limiting (3s throttle).
 */
const validateCreditsAndRateLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const now = new Date();

    // 1. RATE LIMITING (3-second throttle)
    if (user.lastAiRequestAt) {
      const timeDiff = (now.getTime() - user.lastAiRequestAt.getTime()) / 1000;
      if (timeDiff < 3) {
        return res.status(429).json({
          success: false,
          error: `Please wait ${Math.ceil(3 - timeDiff)}s before next request.`
        });
      }
    }

    // 2. CREDIT RESET LOGIC
    let needsReset = false;
    const lastReset = user.lastCreditReset || user.createdAt;
    
    if (user.plan === 'free') {
      // Daily reset for free plan
      const isDifferentDay = now.toDateString() !== lastReset.toDateString();
      if (isDifferentDay) {
        user.credits_remaining = 10;
        needsReset = true;
      }
    } else {
      // Monthly reset for paid plans
      const monthsDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + (now.getMonth() - lastReset.getMonth());
      if (monthsDiff >= 1) {
        user.credits_remaining = user.plan === 'pro' ? 2000 : 500;
        needsReset = true;
      }
    }

    if (needsReset) {
      user.lastCreditReset = now;
      await user.save();
    }

    // 3. CREDIT VALIDATION
    if (user.credits_remaining <= 0) {
      return res.status(403).json({
        success: false,
        error: user.plan === 'free' 
          ? 'Daily AI generation limit reached. Upgrade to continue.' 
          : 'Monthly credits exhausted. Please upgrade or wait for reset.'
      });
    }

    // Update last request time for rate limiting
    user.lastAiRequestAt = now;
    await user.save();

    // Attach user for reuse in controller
    req.fullUser = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { validateCreditsAndRateLimit };
