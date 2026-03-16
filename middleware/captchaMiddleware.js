const { verifyCaptcha } = require('./securityMiddleware');

/**
 * Middleware to verify CAPTCHA on signup and login
 */
const validateCaptcha = async (req, res, next) => {
  try {
    // Bypass if secret is not configured (allows dev without keys)
    if (!process.env.CAPTCHA_SECRET) {
      return next();
    }

    const captchaToken = req.headers['captcha-token'];
    
    // In dev, allow a hardcoded test token
    if (captchaToken === 'test-token') {
      return next();
    }

    const isValid = await verifyCaptcha(captchaToken);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'CAPTCHA verification failed. Please check your keys or send a token.'
      });
    }

    next();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { validateCaptcha };
