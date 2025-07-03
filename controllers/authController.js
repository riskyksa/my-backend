const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'بيانات غير صحيحة',
        details: errors.array()
      });
    }

    const { email, password, username } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: existingUser.email === email ? 'البريد الإلكتروني موجود بالفعل' : 'اسم المستخدم موجود بالفعل'
      });
    }

    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    const user = new User({
      email,
      password,
      username,
      isAdmin: isFirstUser
    });

    await user.save();

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

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'بيانات غير صحيحة',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'الحساب معطل'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

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

const updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const updates = {};

    if (username) {
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

const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'بيانات غير صحيحة',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Invalid current password',
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      message: 'تم تغيير كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('Change password error:', error, error?.stack);
    res.status(500).json({
      error: 'Failed to change password',
      message: 'فشل في تغيير كلمة المرور',
      details: error?.message || error
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