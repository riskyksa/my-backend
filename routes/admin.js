const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  updateUserDeductions,
  updateUsername,
  deleteUser,
  completeSystemReset,
  getSystemStats,
  toggleAdminStatus,
  getMonthlySummary,
  resetDataOnly,
  getAdminSummary,
  getUsersMonthlyTotals,
  deleteAllEntriesForUser,
  getUserSummary
} = require('../controllers/adminController');

const router = express.Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Validation rules
const updateDeductionsValidation = [
  body('userId')
    .isMongoId()
    .withMessage('معرف المستخدم غير صحيح'),
  body('deductions')
    .isFloat({ min: 0 })
    .withMessage('الخصميات يجب أن تكون رقم موجب')
];

const updateUsernameValidation = [
  body('userId')
    .isMongoId()
    .withMessage('معرف المستخدم غير صحيح'),
  body('newUsername')
    .isLength({ min: 3, max: 30 })
    .withMessage('اسم المستخدم يجب أن يكون بين 3 و 30 حرف')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('اسم المستخدم يمكن أن يحتوي على أحرف وأرقام وشرطة سفلية فقط')
];

const systemResetValidation = [
  body('confirmationText')
    .equals('تصفير كامل')
    .withMessage('نص التأكيد غير صحيح')
];

// Routes
router.get('/users', getAllUsers);
router.put('/users/deductions', updateDeductionsValidation, updateUserDeductions);
router.put('/users/username', updateUsernameValidation, updateUsername);
router.delete('/users/:userId', deleteUser);
router.post('/system-reset', systemResetValidation, completeSystemReset);
router.get('/stats', getSystemStats);
router.put('/users/:userId/admin-status', toggleAdminStatus);
router.get('/monthly-summary', getMonthlySummary);
router.post('/reset-data', resetDataOnly);
router.get('/summary', getAdminSummary);
router.get('/users-monthly-totals', getUsersMonthlyTotals);
router.delete('/user-entries/:userId', deleteAllEntriesForUser);
router.get('/user-summary', getUserSummary);

module.exports = router;