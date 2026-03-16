const User = require('../models/User');
const { PLANS } = require('../config/plans_backend');

const checkCreditReset = async (req, res, next) => {
  if (!req.user) return next();

  try {
    const user = await User.findById(req.user.id);
    if (!user) return next();

    const now = new Date();
    const lastReset = new Date(user.lastCreditReset || user.createdAt);
    const planConfig = PLANS[user.plan || 'free'];
    
    let shouldReset = false;

    if (planConfig.resetPeriod === 'daily') {
      // Check if day has changed
      if (now.toDateString() !== lastReset.toDateString()) {
        shouldReset = true;
      }
    } else if (planConfig.resetPeriod === 'monthly') {
      // Check if month or year has changed
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        shouldReset = true;
      }
    }

    if (shouldReset) {
      user.credits_remaining = planConfig.credits;
      user.lastCreditReset = now;
      await user.save();
      // Update req.fullUser if it was already attached
      if (req.fullUser) {
        req.fullUser.credits_remaining = planConfig.credits;
        req.fullUser.lastCreditReset = now;
      }
    }

    next();
  } catch (error) {
    console.error("Credit Reset Error:", error);
    next();
  }
};

module.exports = checkCreditReset;
