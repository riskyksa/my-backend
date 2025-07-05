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
  console.log('=== VALIDATION DEBUG ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request body type:', typeof req.body);
  console.log('Request body keys:', Object.keys(req.body || {}));
  console.log('userId:', req.body?.userId, 'type:', typeof req.body?.userId);
  console.log('amount:', req.body?.amount, 'type:', typeof req.body?.amount);
  console.log('reason:', req.body?.reason, 'type:', typeof req.body?.reason);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return res.status(400).json({
      error: 'Validation failed',
      message: errorMessages,
      details: errors.array()
    });
  }
  console.log('Validation passed successfully');
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
    .custom((value, { req }) => {
      console.log('Validating userId:', value, 'type:', typeof value);
      return true;
    }),
  body('amount')
    .notEmpty()
    .withMessage('المبلغ مطلوب')
    .custom((value, { req }) => {
      console.log('Validating amount:', value, 'type:', typeof value);
      const num = parseFloat(value);
      const isValid = !isNaN(num) && num > 0;
      console.log('Amount validation result:', isValid);
      return isValid;
    })
    .withMessage('المبلغ يجب أن يكون رقم أكبر من صفر'),
  body('reason')
    .notEmpty()
    .withMessage('السبب مطلوب')
    .custom((value, { req }) => {
      console.log('Validating reason:', value, 'type:', typeof value);
      return true;
    })
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