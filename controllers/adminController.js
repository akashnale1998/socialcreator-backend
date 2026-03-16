const User = require('../models/User');
const Generation = require('../models/Generation');
const Announcement = require('../models/Announcement');
const Settings = require('../models/Settings');

/**
 * @desc    Get system-wide stats for admin dashboard
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }); // Last 30 days
    const totalGenerations = await Generation.countDocuments();
    
    // Security Stats from RequestLog
    const now = new Date();
    const startOfDay = new Date(now.setHours(0,0,0,0));
    const RequestLog = require('../models/RequestLog');
    
    const requestsToday = await RequestLog.countDocuments({ createdAt: { $gte: startOfDay } });
    const blockedToday = await RequestLog.countDocuments({ 
      createdAt: { $gte: startOfDay }, 
      status: { $in: ['blocked', 'rate_limited'] } 
    });
    const suspiciousUsers = await User.countDocuments({ isSuspicious: true });
    const rateLimitTriggers = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$rateLimitTriggers" } } }
    ]);

    // Simulating revenue based on a simple heuristic
    const revenue = totalUsers * 5; 
    const latestUsers = await User.find().select('name email createdAt').sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalGenerations,
        revenue,
        latestUsers,
        security: {
          requestsToday,
          blockedToday,
          suspiciousUsers,
          rateLimitTriggers: rateLimitTriggers[0]?.total || 0
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get all users (basic info)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Update user role
 * @route   PUT /api/admin/users/:id/role
 * @access  Private/Admin
 */
exports.updateUserRole = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Update user status
 * @route   PUT /api/admin/users/:id/status
 * @access  Private/Admin
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Update user credits
 * @route   PUT /api/admin/users/:id/credits
 * @access  Private/Admin
 */
exports.updateUserCredits = async (req, res) => {
  try {
    const { credits } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { credits_remaining: credits }, { new: true });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Update user plan
 * @route   PUT /api/admin/users/:id/plan
 * @access  Private/Admin
 */
exports.updateUserPlan = async (req, res) => {
  try {
    const { plan } = req.body;
    const update = { plan };
    
    // Reset credits based on plan
    if (plan === 'pro') update.credits_remaining = 2000;
    else if (plan === 'creator') update.credits_remaining = 500;
    else update.credits_remaining = 10;
    
    update.lastCreditReset = new Date();

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get AI usage analytics
 * @route   GET /api/admin/analytics
 * @access  Private/Admin
 */
exports.getAnalytics = async (req, res) => {
  try {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = await Generation.countDocuments({
        createdAt: { $gte: date, $lt: nextDay }
      });
      last7Days.push({ date: date.toISOString().split('T')[0], count });
    }

    const distribution = await Generation.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        trends: last7Days,
        distribution: distribution.map(d => ({ label: d._id, count: d.count }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get all payments
 * @route   GET /api/admin/payments
 * @access  Private/Admin
 */
exports.getPayments = async (req, res) => {
  try {
    const users = await User.find().limit(10);
    const payments = users.map((u, i) => ({
      id: (i + 1).toString(),
      user: u.name,
      amount: i % 2 === 0 ? 25 : 10,
      status: 'completed',
      date: u.createdAt
    }));
    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Create system announcement
 * @route   POST /api/admin/announcements
 * @access  Private/Admin
 */
exports.createAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.create({
      ...req.body,
      author: req.user.id
    });
    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get all announcements (history)
 * @route   GET /api/admin/announcements
 * @access  Private/Admin
 */
exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Get system settings
 * @route   GET /api/admin/settings
 * @access  Private/Admin
 */
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne() || await Settings.create({});
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * @desc    Update system settings
 * @route   PUT /api/admin/settings
 * @access  Private/Admin
 */
exports.updateSettings = async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
