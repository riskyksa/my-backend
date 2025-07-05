const express = require('express');
const { body, validationResult } = require('express-validator');
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
  getUserSummary,
  addDeduction,
  updateUserAdvances
} = require('../controllers/adminController');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Middleware للتعامل مع أخطاء validation
const handleValidationErrors = (req, res, next) => {
  console.log('Validation middleware - body:', req.body);
  console.log('Validation middleware - headers:', req.headers);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      error: 'Validation failed',
      message: 'بيانات غير صحيحة',
      details: errors.array()
    });
  }
  next();
};

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

const addDeductionValidation = [
  body('userId')
    .notEmpty()
    .withMessage('معرف المستخدم مطلوب')
    .isMongoId()
    .withMessage('معرف المستخدم غير صحيح'),
  body('amount')
    .notEmpty()
    .withMessage('المبلغ مطلوب')
    .isNumeric()
    .withMessage('المبلغ يجب أن يكون رقم')
    .custom(value => parseFloat(value) > 0)
    .withMessage('المبلغ يجب أن يكون أكبر من صفر'),
  body('reason')
    .notEmpty()
    .withMessage('السبب مطلوب')
    .isLength({ min: 3, max: 200 })
    .withMessage('السبب يجب أن يكون بين 3 و 200 حرف')
];

const systemResetValidation = [
  body('confirmationText')
    .equals('تصفير كامل')
    .withMessage('نص التأكيد غير صحيح')
];


router.get('/users', getAllUsers);
router.put('/users/deductions', updateDeductionsValidation, handleValidationErrors, updateUserDeductions);
router.put('/users/username', updateUsernameValidation, handleValidationErrors, updateUsername);
router.post('/users/deduction', addDeductionValidation, handleValidationErrors, addDeduction);
router.put('/users/advances', updateUserAdvances);
router.delete('/users/:userId', deleteUser);
router.post('/system-reset', systemResetValidation, handleValidationErrors, completeSystemReset);
router.get('/stats', getSystemStats);
router.put('/users/:userId/admin-status', toggleAdminStatus);
router.get('/monthly-summary', getMonthlySummary);
router.post('/reset-data', resetDataOnly);
router.get('/summary', getAdminSummary);
router.get('/users-monthly-totals', getUsersMonthlyTotals);
router.delete('/user-entries/:userId', deleteAllEntriesForUser);
router.get('/user-summary', getUserSummary);

module.exports = router;