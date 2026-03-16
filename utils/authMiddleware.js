const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);

    if (!req.user || req.user.status === 'banned') {
      return res.status(403).json({ success: false, error: 'User is banned or account no longer exists' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

// Optional auth - attaches user if token exists, otherwise proceeds as demo
exports.optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(); // Continue without user attached
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    
    // Even if user isn't found or is banned, we don't block here.
    // If we wanted to block banned users trying to use demo, we could throw here.
    // But let's just detach the user if banned, turning them into a demo user.
    if (req.user && req.user.status === 'banned') {
       req.user = null;
    }
  } catch (err) {
    // Invalid token, just act as a demo user
    req.user = null;
  }
  
  next();
};
