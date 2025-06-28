const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Register new user
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'بيانات غير صحيحة',
        details: errors.array()
      });
    }

    const { email, password, username } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: existingUser.email === email ? 'البريد الإلكتروني موجود بالفعل' : 'اسم المستخدم موجود بالفعل'
      });
    }

    // Check if this is the first user (make them admin)
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // Create new user
    const user = new User({
      email,
      password,
      username,
      isAdmin: isFirstUser
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      user: user.toJSON(),
      token
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'فشل في إنشاء الحساب'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'بيانات غير صحيحة',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'الحساب معطل'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      user: user.toJSON(),
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'فشل في تسجيل الدخول'
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'فشل في جلب الملف الشخصي'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const updates = {};

    // Only allow updating username and email
    if (username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.user._id } 
      });
      if (existingUser) {
        return res.status(400).json({
          error: 'Username taken',
          message: 'اسم المستخدم موجود بالفعل'
        });
      }
      updates.username = username;
    }

    if (email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.user._id } 
      });
      if (existingUser) {
        return res.status(400).json({
          error: 'Email taken',
          message: 'البريد الإلكتروني موجود بالفعل'
        });
      }
      updates.email = email;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'تم تحديث الملف الشخصي بنجاح',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'فشل في تحديث الملف الشخصي'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate current password
    const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid current password',
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    res.json({
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'فشل في تغيير كلمة المرور'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
}; 