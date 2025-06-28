const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('البريد الإلكتروني غير صحيح')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('اسم المستخدم يجب أن يكون بين 3 و 30 حرف')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('اسم المستخدم يمكن أن يحتوي على أحرف وأرقام وشرطة سفلية فقط')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('البريد الإلكتروني غير صحيح')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('كلمة المرور مطلوبة')
];

const updateProfileValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('البريد الإلكتروني غير صحيح')
    .normalizeEmail(),
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('اسم المستخدم يجب أن يكون بين 3 و 30 حرف')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('اسم المستخدم يمكن أن يحتوي على أحرف وأرقام وشرطة سفلية فقط')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('كلمة المرور الحالية مطلوبة'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfileValidation, updateProfile);
router.put('/change-password', authenticateToken, changePasswordValidation, changePassword);

module.exports = router; 