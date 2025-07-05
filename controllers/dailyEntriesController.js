const { validationResult } = require('express-validator');
const DailyEntry = require('../models/DailyEntry');
const MonthlyAdvance = require('../models/MonthlyAdvance');
const User = require('../models/User');
const Deduction = require('../models/Deduction');
const fs = require('fs');
const path = require('path');

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

exports.createDailyEntry = async (req, res) => {
  try {
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

    if (!date || !userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'الحقول المطلوبة ناقصة',
        debug: { date, userId }
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
        filename: file.filename,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        originalName: file.originalname
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

exports.getDailyEntries = async (req, res) => {
  try {
    const { year, month, userId } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (year && month) {
      const monthStr = String(month).padStart(2, '0');
      filter.date = { $regex: `^${year}-${monthStr}` };
    } else if (year) {
      filter.date = { $regex: `^${year}-` };
    }

    const entries = await DailyEntry.find(filter).sort({ date: 1 });
    res.json({ entries });
  } catch (error) {
    console.error('Get daily entries error:', error);
    res.status(500).json({ error: 'Failed to get daily entries' });
  }
};

exports.getMonthlyAdvances = async (req, res) => {
  try {
    const { yearMonth, userId } = req.query;
    if (!yearMonth || !userId) {
      return res.status(400).json({ message: 'yearMonth and userId are required' });
    }
    const advances = await MonthlyAdvance.find({ userId, yearMonth });
    res.json({ advances });
  } catch (error) {
    console.error('Get monthly advances error:', error);
    res.status(500).json({ message: 'Failed to get monthly advances' });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const { entryId, attachmentId } = req.params;
    const entry = await DailyEntry.findById(entryId);
    if (!entry) return res.status(404).json({ message: 'المدخل غير موجود' });

    const attachment = entry.attachments.find(att => att._id.toString() === attachmentId);
    if (!attachment) return res.status(404).json({ message: 'المرفق غير موجود' });

    if (attachment.path && fs.existsSync(attachment.path)) {
      try {
        fs.unlinkSync(attachment.path);
      } catch (err) {
        console.error('خطأ أثناء حذف الملف من السيرفر:', err);
      }
    }

    entry.attachments = entry.attachments.filter(att => att._id.toString() !== attachmentId);
    await entry.save();
    res.json({ message: 'تم حذف الصورة بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ أثناء حذف الصورة' });
  }
};

// حذف مدخل كامل
exports.deleteDailyEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const entry = await DailyEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'المدخل غير موجود' });
    }
     await DailyEntry.findByIdAndDelete(entryId);
    res.json({ message: 'تم حذف المدخل بنجاح' });
  } catch (error) {
    console.error('Error deleting daily entry:', error);
    res.status(500).json({ message: 'خطأ أثناء حذف المدخل' });
  }
};

exports.deleteAllEntriesForUser = async (req, res) => {
  try {
    const userId = req.params.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    // (اختياري) حذف ملفات الصور من السيرفر
    /*
    const entries = await DailyEntry.find({ userId });
    entries.forEach(entry => {
      entry.attachments?.forEach(att => {
        // fs.unlinkSync(att.path); // إذا أردت حذف الملف فعلياً
      });
    });
    */
    await DailyEntry.deleteMany({ userId });
    res.json({ message: 'تم حذف جميع المدخلات للمستخدم بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'خطأ أثناء حذف جميع المدخلات' });
  }
};

exports.updateDailyEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const entry = await DailyEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'المدخل غير موجود' });
    }
    if (req.body.cashAmount !== undefined) entry.cashAmount = parseFloat(req.body.cashAmount) || 0;
    if (req.body.networkAmount !== undefined) entry.networkAmount = parseFloat(req.body.networkAmount) || 0;
    if (req.body.purchasesAmount !== undefined) entry.purchasesAmount = parseFloat(req.body.purchasesAmount) || 0;
    if (req.body.advanceAmount !== undefined) entry.advanceAmount = parseFloat(req.body.advanceAmount) || 0;
    if (req.body.notes !== undefined) entry.notes = req.body.notes;
    if (req.body.date) entry.date = req.body.date.includes('T') ? req.body.date.split('T')[0] : req.body.date;

    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.filename,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        originalName: file.originalname
      }));
      entry.attachments = [...entry.attachments, ...newAttachments];
    }

    await entry.save();
    res.json({ message: 'تم تحديث المدخل بنجاح', entry });
  } catch (error) {
    console.error('Error updating daily entry:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث المدخل' });
  }
};

exports.getDeductions = async (req, res) => {
  try {
    const { userId, year, month } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (year && month) {
      const monthStr = String(month).padStart(2, '0');
      const startDate = new Date(`${year}-${monthStr}-01`);
      const endDate = new Date(`${year}-${monthStr}-31`);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const deductions = await Deduction.find(filter)
      .sort({ date: -1 })
      .populate('userId', 'username');

    res.json({ deductions });
  } catch (error) {
    console.error('Get deductions error:', error);
    res.status(500).json({ error: 'Failed to get deductions' });
  }
};