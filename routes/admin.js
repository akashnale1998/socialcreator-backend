const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../utils/authMiddleware');
const { admin } = require('../utils/adminMiddleware');

// All routes here require protection and admin role
router.use(protect);
router.use(admin);

router.get('/stats', adminController.getAdminStats);
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/credits', adminController.updateUserCredits);
router.get('/analytics', adminController.getAnalytics);
router.get('/payments', adminController.getPayments);
router.post('/announcements', adminController.createAnnouncement);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
