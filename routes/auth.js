const express = require('express');
const { register, login, getMe, verifyEmail, resendVerification } = require('../controllers/authController');
const { protect } = require('../utils/authMiddleware');
const { validateCaptcha } = require('../middleware/captchaMiddleware');
const Passport = require('passport');
const checkCreditReset = require('../middleware/creditReset');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/signup', validateCaptcha, register);
router.post('/login', validateCaptcha, login);
router.get('/me', protect, checkCreditReset, getMe);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// OAuth Initiation
router.get('/google', Passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/github', Passport.authenticate('github', { scope: ['user:email'] }));
router.get('/twitter', Passport.authenticate('twitter'));

// OAuth Callbacks
const handleOAuthCallback = (req, res) => {
  const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  // Redirect to dashboard with token in a way frontend can read it
  // Since we use localStorage, we might need a temporary landing page or append to URL
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?token=${token}`);
};

router.get('/google/callback', Passport.authenticate('google', { session: false, failureRedirect: '/login' }), handleOAuthCallback);
router.get('/github/callback', Passport.authenticate('github', { session: false, failureRedirect: '/login' }), handleOAuthCallback);
router.get('/twitter/callback', Passport.authenticate('twitter', { session: false, failureRedirect: '/login' }), handleOAuthCallback);

module.exports = router;
