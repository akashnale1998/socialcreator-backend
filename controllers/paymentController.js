const User = require('../models/User');

// @desc    Purchase Credit Pack
// @route   POST /api/payment/purchase-credits
// @access  Private
exports.purchaseCredits = async (req, res) => {
  try {
    const { credits, amount, paymentId } = req.body;

    if (!credits || !amount) {
      return res.status(400).json({ success: false, error: 'Credits and amount are required' });
    }

    // In a real app, verify paymentId with Razorpay here
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.credits_remaining += parseInt(credits);
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        credits_remaining: user.credits_remaining
      },
      message: `${credits} credits added successfully!`
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};

// @desc    Purchase Lifetime Deal
// @route   POST /api/payment/purchase-lifetime
// @access  Private
exports.purchaseLifetime = async (req, res) => {
  try {
    const { amount, paymentId } = req.body;

    // In a real app, verify paymentId with Razorpay here

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.plan = 'lifetime';
    user.is_lifetime_user = true;
    user.credits_remaining = 999999; // Representing unlimited
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        plan: user.plan,
        is_lifetime_user: user.is_lifetime_user,
        credits_remaining: user.credits_remaining
      },
      message: 'Lifetime Creator Plan activated! Enjoy unlimited access.'
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
};
