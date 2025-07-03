const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, canAccessUser } = require('../middleware/auth');
const { uploadMultipleFiles } = require('../middleware/upload');
const {
  createDailyEntry, getDailyEntries, getMonthlyAdvances, deleteAttachment,
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

router.get('/', canAccessUser, getDailyEntries);
router.get('/monthly-advances', canAccessUser, getMonthlyAdvances);
router.post('/create', entryValidation, canAccessUser, uploadMultipleFiles, createDailyEntry);

router.delete('/:entryId/attachments/:attachmentId', deleteAttachment);

router.delete('/:entryId', require('../controllers/dailyEntriesController').deleteDailyEntry);

router.delete('/user/:userId/all-entries', require('../controllers/dailyEntriesController').deleteAllEntriesForUser);

router.put('/:entryId', uploadMultipleFiles, require('../controllers/dailyEntriesController').updateDailyEntry);

module.exports = router;