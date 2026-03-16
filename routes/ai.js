const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect, optionalAuth } = require('../utils/authMiddleware');
const checkCreditReset = require('../middleware/creditReset');
const { validateSecurityAndCredits } = require('../middleware/securityMiddleware');
const { applyDemoLimits } = require('../middleware/demoLimitMiddleware');

router.use(checkCreditReset);

const upload = require('../middleware/uploadMiddleware');

// Generation routes with credit & security protection
router.post('/generate-hook', optionalAuth, applyDemoLimits, validateSecurityAndCredits, aiController.generateHook);
router.post('/analyze-hook', protect, validateSecurityAndCredits, aiController.analyzeHook);
router.post('/generate-title', optionalAuth, applyDemoLimits, validateSecurityAndCredits, aiController.generateTitle);
router.post('/analyze-script', protect, validateSecurityAndCredits, aiController.analyzeScript);
router.post('/generate-ideas', optionalAuth, applyDemoLimits, validateSecurityAndCredits, aiController.generateIdeas);
router.post('/analyze-reel', protect, validateSecurityAndCredits, aiController.analyzeReel);
router.post('/generate-script', protect, validateSecurityAndCredits, aiController.generateScript);
router.post('/generate-caption', optionalAuth, applyDemoLimits, validateSecurityAndCredits, aiController.generateCaption);
router.post('/analyze-viral-score', protect, validateSecurityAndCredits, aiController.analyzeViralScore);
router.post('/improve-caption', protect, validateSecurityAndCredits, aiController.improveCaption);
router.post('/analyze-video-viral-score', upload.single('video'), optionalAuth, applyDemoLimits, validateSecurityAndCredits, aiController.analyzeVideoViralScore);
router.post('/generate-hashtags', optionalAuth, applyDemoLimits, validateSecurityAndCredits, aiController.generateHashtags);
router.post('/analyze-profile', upload.single('screenshot'), protect, validateSecurityAndCredits, aiController.analyzeProfile);
router.post('/generate-full-post', optionalAuth, applyDemoLimits, validateSecurityAndCredits, aiController.generateFullPost);


// Non-generation/Discovery routes
router.get('/trending', protect, aiController.getTrending);
router.get('/stats', protect, aiController.getStats);
router.get('/daily-viral-ideas', protect, aiController.getDailyViralIdeas);
router.get('/history', protect, aiController.getHistory);

module.exports = router;
