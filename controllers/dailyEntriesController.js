const { validationResult } = require('express-validator');
const DailyEntry = require('../models/DailyEntry');
const MonthlyAdvance = require('../models/MonthlyAdvance');
const User = require('../models/User');

// Get daily entries for a user
const getDailyEntries = async (req, res) => {
  try {
    const { targetUserId, year, month } = req.query;
    const userId = targetUserId || req.user._id;

    // Check permissions
    if (userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'ليس لديك صلاحية لعرض هذه البيانات'
      });
    }

    let query = { userId };

    // Filter by year and month if provided
    if (year && month) {
      const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
      query.date = { $regex: `^${yearMonth}` };
    }

    const entries = await DailyEntry.find(query)
      .sort({ date: -1 })
      .populate('userId', 'username');

    res.json({
      entries,
      count: entries.length
    });

  } catch (error) {
    console.error('Get daily entries error:', error);
    res.status(500).json({
      error: 'Failed to get daily entries',
      message: 'فشل في جلب المدخلات اليومية'
    });
  }
};

// Create or update daily entry
const upsertDailyEntry = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'بيانات غير صحيحة',
        details: errors.array()
      });
    }

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

    // Check permissions
    if (userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'ليس لديك صلاحية لتعديل هذه البيانات'
      });
    }

    // Get target user for deductions
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    // Prepare entry data
    const entryData = {
      userId,
      date,
      cashAmount: cashAmount || 0,
      networkAmount: networkAmount || 0,
      purchasesAmount: purchasesAmount || 0,
      advanceAmount: advanceAmount || 0,
      notes: notes || ''
    };

    // Add file attachments if any
    if (req.files && req.files.length > 0) {
      entryData.attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size
      }));
    }

    // Find existing entry
    const existingEntry = await DailyEntry.findOne({
      userId,
      date
    });

    let entry;
    if (existingEntry) {
      // Update existing entry
      entry = await DailyEntry.findByIdAndUpdate(
        existingEntry._id,
        entryData,
        { new: true, runValidators: true }
      ).populate('userId', 'username');
    } else {
      // Create new entry
      entry = new DailyEntry(entryData);
      await entry.save();
      entry = await entry.populate('userId', 'username');
    }

    // Update monthly advances if advance amount is provided
    if (advanceAmount) {
      await updateMonthlyAdvances(userId, date, advanceAmount);
    }

    res.json({
      message: existingEntry ? 'تم تحديث المدخل بنجاح' : 'تم إنشاء المدخل بنجاح',
      entry
    });

  } catch (error) {
    console.error('Upsert daily entry error:', error);
    res.status(500).json({
      error: 'Failed to save daily entry',
      message: 'فشل في حفظ المدخل اليومي'
    });
  }
};

// Delete daily entry
const deleteDailyEntry = async (req, res) => {
  try {
    const { entryId } = req.params;

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'ليس لديك صلاحية لحذف البيانات'
      });
    }

    const entry = await DailyEntry.findById(entryId);
    if (!entry) {
      return res.status(404).json({
        error: 'Entry not found',
        message: 'المدخل غير موجود'
      });
    }

    await DailyEntry.findByIdAndDelete(entryId);

    res.json({
      message: 'تم حذف المدخل بنجاح'
    });

  } catch (error) {
    console.error('Delete daily entry error:', error);
    res.status(500).json({
      error: 'Failed to delete daily entry',
      message: 'فشل في حذف المدخل اليومي'
    });
  }
};

// Get monthly advances
const getMonthlyAdvances = async (req, res) => {
  try {
    const { yearMonth, targetUserId } = req.query;
    const userId = targetUserId || req.user._id;

    // Check permissions
    if (userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'ليس لديك صلاحية لعرض هذه البيانات'
      });
    }

    let query = { userId };
    if (yearMonth) {
      query.yearMonth = yearMonth;
    }

    const advances = await MonthlyAdvance.find(query)
      .sort({ yearMonth: -1 })
      .populate('userId', 'username');

    res.json({
      advances,
      count: advances.length
    });

  } catch (error) {
    console.error('Get monthly advances error:', error);
    res.status(500).json({
      error: 'Failed to get monthly advances',
      message: 'فشل في جلب السلفيات الشهرية'
    });
  }
};

// Helper function to update monthly advances
const updateMonthlyAdvances = async (userId, date, advanceAmount) => {
  try {
    const yearMonth = date.substring(0, 7); // YYYY-MM

    // Calculate total advances for the month
    const monthlyEntries = await DailyEntry.find({
      userId,
      date: { $regex: `^${yearMonth}` }
    });

    const monthlyAdvancesTotal = monthlyEntries
      .filter(entry => entry.advanceAmount)
      .reduce((sum, entry) => sum + (entry.advanceAmount || 0), 0);

    // Update or create monthly advance record
    await MonthlyAdvance.findOneAndUpdate(
      { userId, yearMonth },
      { totalAdvances: monthlyAdvancesTotal },
      { upsert: true, new: true }
    );

  } catch (error) {
    console.error('Update monthly advances error:', error);
    throw error;
  }
};

// Get entry statistics
const getEntryStats = async (req, res) => {
  try {
    const { targetUserId, year, month } = req.query;
    const userId = targetUserId || req.user._id;

    // Check permissions
    if (userId.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'ليس لديك صلاحية لعرض هذه البيانات'
      });
    }

    let dateFilter = {};
    if (year && month) {
      const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
      dateFilter = { $regex: `^${yearMonth}` };
    }

    const entries = await DailyEntry.find({
      userId,
      date: dateFilter
    });

    const stats = {
      totalEntries: entries.length,
      totalCash: entries.reduce((sum, entry) => sum + (entry.cashAmount || 0), 0),
      totalNetwork: entries.reduce((sum, entry) => sum + (entry.networkAmount || 0), 0),
      totalPurchases: entries.reduce((sum, entry) => sum + (entry.purchasesAmount || 0), 0),
      totalAdvances: entries.reduce((sum, entry) => sum + (entry.advanceAmount || 0), 0),
      totalIncome: entries.reduce((sum, entry) => sum + (entry.total || 0), 0),
      totalRemaining: entries.reduce((sum, entry) => sum + (entry.remaining || 0), 0)
    };

    res.json(stats);

  } catch (error) {
    console.error('Get entry stats error:', error);
    res.status(500).json({
      error: 'Failed to get entry statistics',
      message: 'فشل في جلب إحصائيات المدخلات'
    });
  }
};

module.exports = {
  getDailyEntries,
  upsertDailyEntry,
  deleteDailyEntry,
  getMonthlyAdvances,
  getEntryStats
}; 