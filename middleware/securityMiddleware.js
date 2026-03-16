const User = require('../models/User');
const RequestLog = require('../models/RequestLog');
const axios = require('axios'); // For captcha verification
const { PLANS, CREDIT_COSTS } = require('../config/plans_backend');

/**
 * Helper to log requests to the database
 */
const logRequest = async (userId, endpoint, status, reason = '') => {
  try {
    await RequestLog.create({
      user: userId,
      endpoint,
      status,
      reason
    });
  } catch (err) {
    console.error('Logging Error:', err.message);
  }
};

/**
 * CAPTCHA Verification Helper
 */
const verifyCaptcha = async (token) => {
  if (!token) return false;
  try {
    // This is a placeholder for Cloudflare Turnstile or Google reCAPTCHA
    // In a real scenario, use process.env.CAPTCHA_SECRET
    const secret = process.env.CAPTCHA_SECRET;
    const response = await axios.post(
      `https://challenges.cloudflare.com/turnstile/v0/siteverify`,
      { secret, response: token }
    );
    return response.data.success;
  } catch (err) {
    console.error('CAPTCHA Verification Error:', err.message);
    return false;
  }
};

/**
 * Comprehensive Security & Credit Middleware
 */
const validateSecurityAndCredits = async (req, res, next) => {
  try {
    if (req.isDemo) {
      return next();
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const now = new Date();
    const endpoint = req.originalUrl;

    // 1. CHECK BLOCK STATUS
    if (user.blockExpiresAt && user.blockExpiresAt > now) {
      await logRequest(user._id, endpoint, 'blocked', 'Account temporarily blocked');
      return res.status(403).json({
        success: false,
        error: `Your account is temporarily blocked. Try again in ${Math.ceil((user.blockExpiresAt - now) / 60000)} minutes.`
      });
    }

    // 2. CAPTCHA VERIFICATION (First AI request protection)
    if (!user.firstAiRequestDone && process.env.CAPTCHA_SECRET) {
      const captchaToken = req.headers['captcha-token'];
      const isValid = await verifyCaptcha(captchaToken);
      if (!isValid) {
        await logRequest(user._id, endpoint, 'blocked', 'CAPTCHA required for first request');
        return res.status(400).json({
          success: false,
          error: 'CAPTCHA verification required for your first AI generation.',
          requireCaptcha: true
        });
      }
      user.firstAiRequestDone = true;
    } else if (!user.firstAiRequestDone) {
      // If no secret is set, we just mark it as done to skip permanently
      user.firstAiRequestDone = true;
    }

    // 3. BURST DETECTION (Max 10 requests / 10s)
    const burstWindow = 10 * 1000; // 10 seconds
    if (now - user.burstRequests.windowStart < burstWindow) {
      user.burstRequests.count += 1;
      if (user.burstRequests.count > 10) {
        user.isSuspicious = true;
        user.blockExpiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 min block
        await user.save();
        await logRequest(user._id, endpoint, 'blocked', 'Burst limit exceeded (10/10s)');
        return res.status(429).json({
          success: false,
          error: 'Suspicious activity detected. Your account is blocked for 10 minutes.'
        });
      }
    } else {
      user.burstRequests.count = 1;
      user.burstRequests.windowStart = now;
    }

    // 4. RATE LIMITING (3-second throttle)
    if (user.lastAiRequestAt) {
      const timeDiff = (now.getTime() - user.lastAiRequestAt.getTime()) / 1000;
      if (timeDiff < 3) {
        user.rateLimitTriggers += 1;
        await user.save();
        await logRequest(user._id, endpoint, 'rate_limited', '3s throttle triggered');
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please wait a few seconds before generating again.'
        });
      }
    }

    // 5. HOURLY LIMITS
    const hourlyWindow = 60 * 60 * 1000;
    const planConfig = PLANS[user.plan || 'free'];
    const hourLimit = planConfig?.hourlyLimit || 20;

    if (now - user.hourlyAiRequests.resetAt < hourlyWindow) {
      if (user.hourlyAiRequests.count >= hourLimit) {
        await logRequest(user._id, endpoint, 'rate_limited', 'Hourly limit reached');
        return res.status(429).json({
          success: false,
          error: `Hourly limit reached (${hourLimit}/hr). Please wait before generating more content.`
        });
      }
      user.hourlyAiRequests.count += 1;
    } else {
      user.hourlyAiRequests.count = 1;
      user.hourlyAiRequests.resetAt = now;
    }

    // 6. TOOL COST CALCULATION
    const pathParts = endpoint.split('?')[0].split('/');
    const cleanEndpoint = pathParts[pathParts.length - 1];
    const requiredCredits = CREDIT_COSTS[cleanEndpoint] || 1;

    // 7. DAILY/MONTHLY CREDIT RESET & VALIDATION
    let needsReset = false;
    const lastReset = user.lastCreditReset || user.createdAt;
    
    if (user.plan === 'free') {
      const isDifferentDay = now.toDateString() !== lastReset.toDateString();
      if (isDifferentDay) {
        user.credits_remaining = planConfig.dailyLimit;
        needsReset = true;
      }
    } else {
      const monthsDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + (now.getMonth() - lastReset.getMonth());
      if (monthsDiff >= 1) {
        user.credits_remaining = planConfig.monthlyLimit;
        needsReset = true;
      }
    }

    if (needsReset) {
      user.lastCreditReset = now;
    }

    if (user.credits_remaining < requiredCredits) {
      await logRequest(user._id, endpoint, 'blocked', `Insufficient credits (Required: ${requiredCredits})`);
      return res.status(403).json({
        success: false,
        error: `Insufficient credits. This tool requires ${requiredCredits} credits. Upgrade your plan to continue.`,
        requiredCredits
      });
    }

    // Successful request checks passed
    user.lastAiRequestAt = now;
    await user.save();
    await logRequest(user._id, endpoint, 'allowed');

    req.fullUser = user;
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { validateSecurityAndCredits, verifyCaptcha };
