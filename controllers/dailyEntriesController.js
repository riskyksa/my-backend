const { validationResult } = require('express-validator');
const DailyEntry = require('../models/DailyEntry');
const MonthlyAdvance = require('../models/MonthlyAdvance');
const User = require('../models/User');

exports.createDailyEntry = async (req, res) => {
  try {
    // Debug logging
    console.log('=== [CREATE DAILY ENTRY] ===');
    console.log('Body:', req.body);
    console.log('Files:', req.files);

    const {
      date,
      cashAmount,
      networkAmount,
      purchasesAmount,
      advanceAmount,
      notes,
      targetUserId
    } = req.body;

    const userId = targetUserId || req.user._id;

    // Validation
    if (!date || !userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'الحقول المطلوبة ناقصة',
        debug: {
          date,
          userId
        }
      });
    }

    const cleanDate = date.includes('T') ? date.split('T')[0] : date;

    const newEntry = await DailyEntry.create({
      userId,
      date: cleanDate,
      cashAmount: parseFloat(cashAmount) || 0,
      networkAmount: parseFloat(networkAmount) || 0,
      purchasesAmount: parseFloat(purchasesAmount) || 0,
      advanceAmount: parseFloat(advanceAmount) || 0,
      notes: notes || '',
      attachments: req.files?.map(file => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size
      })) || []
    });

    if (advanceAmount > 0) {
      await updateMonthlyAdvances(userId, cleanDate, advanceAmount);
    }

    res.status(201).json({
      message: 'تم إنشاء المدخل بنجاح',
      entry: newEntry
    });

  } catch (error) {
    console.error('Error creating daily entry:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'حدث خطأ في الخادم'
    });
  }
};

// Helper to update advances
const updateMonthlyAdvances = async (userId, date, advanceAmount) => {
  try {
    const yearMonth = date.substring(0, 7);
    const entries = await DailyEntry.find({
      userId,
      date: { $regex: `^${yearMonth}` }
    });

    const total = entries.reduce((sum, entry) => sum + (entry.advanceAmount || 0), 0);

    await MonthlyAdvance.findOneAndUpdate(
      { userId, yearMonth },
      { totalAdvances: total },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Monthly advance update error:', err);
    throw err;
  }
};
