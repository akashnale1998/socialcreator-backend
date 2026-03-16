const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail } = require('../services/mail');

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, ref } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Generate unique referral code
    const referral_code = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      referral_code,
      is_verified: false // Explicitly set to false
    });

    // Handle Referral logic
    if (ref) {
      const referrer = await User.findOne({ referral_code: ref });
      if (referrer) {
        user.referred_by = referrer._id;
        await user.save();

        // Reward referrer with 20 credits
        referrer.credits_remaining += 20;
        referrer.earned_credits += 20;
        referrer.referrals_count += 1;
        await referrer.save();
      }
    }

    // Send verification email (optional now)
    try {
      sendVerificationEmail(user).catch(err => console.error('Verification email suppressed:', err));
    } catch (mailErr) {
      console.error('Mail Error:', mailErr);
    }

    sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if user is banned
    if (user.status === 'banned') {
      return res.status(403).json({ success: false, error: 'Your account has been suspended. Please contact support.' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Invalid verification token' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(200).json({ success: true, message: 'Email already verified' });
    }

    // Update user
    user.is_verified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.'
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: 'Token has expired or is invalid.'
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.is_verified) {
      return res.status(400).json({ success: false, error: 'Email is already verified' });
    }

    // Send verification email
    await sendVerificationEmail(user);

    res.status(200).json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      credits: user.credits_remaining,
      role: user.role,
      plan: user.plan,
      is_lifetime_user: user.is_lifetime_user,
      referral_code: user.referral_code,
      referrals_count: user.referrals_count,
      earned_credits: user.earned_credits
    }
  });
};
