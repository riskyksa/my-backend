const express = require('express');
const { authenticateToken, canAccessUser } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get user by ID (admin or self)
router.get('/:userId', canAccessUser, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'فشل في جلب بيانات المستخدم'
    });
  }
});

// Get current user's profile
router.get('/profile/me', async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'فشل في جلب الملف الشخصي'
    });
  }
});

module.exports = router; 