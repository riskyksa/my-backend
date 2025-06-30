const express = require('express');
const { body, query } = require('express-validator');
const { authenticateToken, canAccessUser } = require('../middleware/auth');
const { uploadMultipleFiles } = require('../middleware/upload');
const {
  createDailyEntry
} = require('../controllers/dailyEntriesController');

const router = express.Router();

router.use(authenticateToken);

const entryValidation = [
  body('date')
    .customSanitizer(val => val?.includes('T') ? val.split('T')[0] : val)
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('تأكد من صيغة التاريخ (YYYY-MM-DD)'),
  body('targetUserId').optional().isMongoId().withMessage('معرف المستخدم غير صالح')
];

router.post('/create', entryValidation, canAccessUser, uploadMultipleFiles, createDailyEntry);

module.exports = router;
