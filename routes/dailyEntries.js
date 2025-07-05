const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, canAccessUser } = require('../middleware/auth');
const { uploadMultipleFiles } = require('../middleware/upload');
const {
  createDailyEntry, getDailyEntries, getMonthlyAdvances, deleteAttachment, getDeductions,
} = require('../controllers/dailyEntriesController');

const router = express.Router();

// معالجة طلبات OPTIONS قبل أي middleware آخر
router.options('*', (req, res) => {
  const allowedOrigins = ['http://localhost:5173', 'https://web-production-0f21.up.railway.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.status(200).end();
});

router.use(authenticateToken);

const entryValidation = [
  body('date')
    .customSanitizer(val => val?.includes('T') ? val.split('T')[0] : val)
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('تأكد من صيغة التاريخ (YYYY-MM-DD)'),
  body('targetUserId').optional().isMongoId().withMessage('معرف المستخدم غير صالح')
];

router.get('/', canAccessUser, getDailyEntries);
router.get('/monthly-advances', canAccessUser, getMonthlyAdvances);
router.get('/deductions', canAccessUser, getDeductions);
router.post('/create', entryValidation, canAccessUser, uploadMultipleFiles, createDailyEntry);

router.delete('/:entryId/attachments/:attachmentId', deleteAttachment);

router.delete('/:entryId', require('../controllers/dailyEntriesController').deleteDailyEntry);

router.delete('/user/:userId/all-entries', require('../controllers/dailyEntriesController').deleteAllEntriesForUser);

router.put('/:entryId', uploadMultipleFiles, require('../controllers/dailyEntriesController').updateDailyEntry);

module.exports = router;