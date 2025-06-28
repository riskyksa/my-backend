const express = require('express');
const { body, query } = require('express-validator');
const { authenticateToken, canAccessUser } = require('../middleware/auth');
const { uploadMultipleFiles } = require('../middleware/upload');
const {
  getDailyEntries,
  upsertDailyEntry,
  deleteDailyEntry,
  getMonthlyAdvances,
  getEntryStats
} = require('../controllers/dailyEntriesController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation rules
const entryValidation = [
  body('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('التاريخ يجب أن يكون بصيغة YYYY-MM-DD'),
  body('cashAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('المبلغ النقدي يجب أن يكون رقم موجب'),
  body('networkAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('مبلغ الشبكة يجب أن يكون رقم موجب'),
  body('purchasesAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('مبلغ المشتريات يجب أن يكون رقم موجب'),
  body('advanceAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('مبلغ السلفية يجب أن يكون رقم موجب'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('الملاحظات يجب أن تكون أقل من 1000 حرف'),
  body('targetUserId')
    .optional()
    .isMongoId()
    .withMessage('معرف المستخدم غير صحيح')
];

const queryValidation = [
  query('targetUserId')
    .optional()
    .isMongoId()
    .withMessage('معرف المستخدم غير صحيح'),
  query('year')
    .optional()
    .isInt({ min: 1900, max: 2100 })
    .withMessage('السنة غير صحيحة'),
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('الشهر غير صحيح'),
  query('yearMonth')
    .optional()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('السنة-الشهر يجب أن يكون بصيغة YYYY-MM')
];

// Routes
router.get('/', queryValidation, canAccessUser, getDailyEntries);
router.post('/', entryValidation, canAccessUser, uploadMultipleFiles, upsertDailyEntry);
router.put('/:entryId', entryValidation, canAccessUser, uploadMultipleFiles, upsertDailyEntry);
router.delete('/:entryId', deleteDailyEntry);
router.get('/monthly-advances', queryValidation, canAccessUser, getMonthlyAdvances);
router.get('/stats', queryValidation, canAccessUser, getEntryStats);

module.exports = router; 