const express = require('express');
const router = express.Router();
const { purchaseCredits, purchaseLifetime } = require('../controllers/paymentController');
const { protect } = require('../utils/authMiddleware');

router.post('/purchase-credits', protect, purchaseCredits);
router.post('/purchase-lifetime', protect, purchaseLifetime);

module.exports = router;
