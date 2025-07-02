const { validationResult } = require('express-validator');
const User = require('../models/User');
const DailyEntry = require('../models/DailyEntry');
const MonthlyAdvance = require('../models/MonthlyAdvance');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('-password')
      .sort({ username: 1 });

    res.json({
      users,
      count: users.length
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'فشل في جلب المستخدمين'
    });
  }
};

// Update user deductions (admin only)
const updateUserDeductions = async (req, res) => {
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

    const { userId, deductions } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    user.deductions = deductions;
    await user.save();

    res.json({
      message: 'تم تحديث الخصميات بنجاح',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Update user deductions error:', error);
    res.status(500).json({
      error: 'Failed to update deductions',
      message: 'فشل في تحديث الخصميات'
    });
  }
};

// Update username (admin only)
const updateUsername = async (req, res) => {
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

    const { userId, newUsername } = req.body;

    // Check if username is already taken
    const existingUser = await User.findOne({ 
      username: newUsername,
      _id: { $ne: userId }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Username taken',
        message: 'اسم المستخدم موجود بالفعل'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    user.username = newUsername;
    await user.save();

    res.json({
      message: 'تم تحديث اسم المستخدم بنجاح',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({
      error: 'Failed to update username',
      message: 'فشل في تحديث اسم المستخدم'
    });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    if (user.isAdmin) {
      return res.status(400).json({
        error: 'Cannot delete admin',
        message: 'لا يمكن حذف حساب المدير'
      });
    }

    // Delete all user's daily entries
    await DailyEntry.deleteMany({ userId });

    // Delete all user's monthly advances
    await MonthlyAdvance.deleteMany({ userId });

    // Deactivate user instead of deleting
    user.isActive = false;
    await user.save();

    res.json({
      message: 'تم حذف المستخدم بنجاح'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: 'فشل في حذف المستخدم'
    });
  }
};

// Complete system reset (admin only)
const completeSystemReset = async (req, res) => {
  try {
    const { confirmationText } = req.body;

    // Verify confirmation text
    if (confirmationText !== 'تصفير كامل') {
      return res.status(400).json({
        error: 'Invalid confirmation',
        message: 'نص التأكيد غير صحيح'
      });
    }

    const adminUserId = req.user._id;

    // Delete all daily entries
    await DailyEntry.deleteMany({});

    // Delete all monthly advances
    await MonthlyAdvance.deleteMany({});

    // Deactivate all users except admin
    await User.updateMany(
      { _id: { $ne: adminUserId } },
      { isActive: false }
    );

    // Reset admin deductions
    await User.findByIdAndUpdate(adminUserId, { deductions: 0 });

    res.json({
      message: 'تم تصفير النظام بنجاح'
    });

  } catch (error) {
    console.error('System reset error:', error);
    res.status(500).json({
      error: 'Failed to reset system',
      message: 'فشل في تصفير النظام'
    });
  }
};

// Get system statistics (admin only)
const getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalEntries = await DailyEntry.countDocuments();
    const totalAdvances = await MonthlyAdvance.countDocuments();

    // Get recent activity
    const recentEntries = await DailyEntry.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'username');

    // Get monthly totals
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyEntries = await DailyEntry.find({
      date: { $regex: `^${currentMonth}` }
    });

    const monthlyStats = {
      totalCash: monthlyEntries.reduce((sum, entry) => sum + (entry.cashAmount || 0), 0),
      totalNetwork: monthlyEntries.reduce((sum, entry) => sum + (entry.networkAmount || 0), 0),
      totalPurchases: monthlyEntries.reduce((sum, entry) => sum + (entry.purchasesAmount || 0), 0),
      totalAdvances: monthlyEntries.reduce((sum, entry) => sum + (entry.advanceAmount || 0), 0)
    };

    res.json({
      totalUsers,
      totalEntries,
      totalAdvances,
      recentEntries,
      monthlyStats
    });

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      error: 'Failed to get system statistics',
      message: 'فشل في جلب إحصائيات النظام'
    });
  }
};

// Toggle user admin status (admin only)
const toggleAdminStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    // Prevent removing the last admin
    if (user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: 'Cannot remove last admin',
          message: 'لا يمكن إزالة المدير الأخير'
        });
      }
    }

    user.isAdmin = !user.isAdmin;
    await user.save();

    res.json({
      message: user.isAdmin ? 'تم منح صلاحيات المدير' : 'تم إزالة صلاحيات المدير',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Toggle admin status error:', error);
    res.status(500).json({
      error: 'Failed to toggle admin status',
      message: 'فشل في تغيير صلاحيات المدير'
    });
  }
};

// Get monthly summary (admin only)
const getMonthlySummary = async (req, res) => {
  const { year, month } = req.query;
  // اجلب كل DailyEntry لهذا الشهر
  const monthStr = String(month).padStart(2, '0');
  const entries = await require('../models/DailyEntry').find({
    date: { $regex: `^${year}-${monthStr}` }
  });

  // ملخص يومي
  const dailySummary = {};
  entries.forEach(entry => {
    if (!dailySummary[entry.date]) {
      dailySummary[entry.date] = {
        totalCash: 0, totalNetwork: 0, totalPurchases: 0, totalAdvances: 0, totalAmount: 0, totalRemaining: 0, entriesCount: 0
      };
    }
    dailySummary[entry.date].totalCash += entry.cashAmount || 0;
    dailySummary[entry.date].totalNetwork += entry.networkAmount || 0;
    dailySummary[entry.date].totalPurchases += entry.purchasesAmount || 0;
    dailySummary[entry.date].totalAdvances += entry.advanceAmount || 0;
    dailySummary[entry.date].totalAmount += (entry.cashAmount || 0) + (entry.networkAmount || 0);
    dailySummary[entry.date].totalRemaining += ((entry.cashAmount || 0) + (entry.networkAmount || 0)) - (entry.purchasesAmount || 0);
    dailySummary[entry.date].entriesCount += 1;
  });

  // ملخص المستخدمين
  const users = await require('../models/User').find({});
  const usersSummary = users.map(user => {
    const userEntries = entries.filter(e => e.userId.toString() === user._id.toString());
    const totalCash = userEntries.reduce((sum, e) => sum + (e.cashAmount || 0), 0);
    const totalNetwork = userEntries.reduce((sum, e) => sum + (e.networkAmount || 0), 0);
    const totalPurchases = userEntries.reduce((sum, e) => sum + (e.purchasesAmount || 0), 0);
    const totalAdvances = userEntries.reduce((sum, e) => sum + (e.advanceAmount || 0), 0);
    const totalAmount = totalCash + totalNetwork;
    const totalRemaining = totalAmount - totalPurchases - (user.deductions || 0);
    const activeDays = userEntries.length;
    return {
      userId: user._id,
      username: user.username,
      isAdmin: user.isAdmin,
      totalCash,
      totalNetwork,
      totalPurchases,
      totalAdvances,
      totalAmount,
      deductions: user.deductions || 0,
      totalRemaining,
      activeDays
    };
  });

  res.json({
    dailySummary: Object.entries(dailySummary).map(([date, data]) => ({ date, ...data })),
    usersSummary
  });
};

// Reset data only (admin only)
const resetDataOnly = async (req, res) => {
  const { confirmationText } = req.body;
  if (confirmationText !== 'تصفير البيانات') {
    return res.status(400).json({ message: 'كلمة التأكيد غير صحيحة' });
  }
  await require('../models/DailyEntry').deleteMany({});
  await require('../models/MonthlyAdvance').deleteMany({});
  res.json({ message: 'تم تصفير البيانات المالية بنجاح' });
};

// ملخص شامل للإدارة (dailySummary, usersSummary, totals)
const getAdminSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ message: 'year and month are required' });
    }
    const monthStr = String(month).padStart(2, '0');
    const dateRegex = new RegExp(`^${year}-${monthStr}`);

    // جلب جميع المدخلات لهذا الشهر
    const entries = await require('../models/DailyEntry').find({ date: { $regex: dateRegex } });

    // dailySummary: لكل يوم
    const dailyMap = {};
    entries.forEach(entry => {
      if (!dailyMap[entry.date]) {
        dailyMap[entry.date] = {
          date: entry.date,
          totalCash: 0,
          totalNetwork: 0,
          totalPurchases: 0,
          totalAdvances: 0,
          totalAmount: 0,
          totalRemaining: 0,
          entriesCount: 0
        };
      }
      dailyMap[entry.date].totalCash += entry.cashAmount || 0;
      dailyMap[entry.date].totalNetwork += entry.networkAmount || 0;
      dailyMap[entry.date].totalPurchases += entry.purchasesAmount || 0;
      dailyMap[entry.date].totalAdvances += entry.advanceAmount || 0;
      dailyMap[entry.date].totalAmount += (entry.cashAmount || 0) + (entry.networkAmount || 0);
      dailyMap[entry.date].totalRemaining += ((entry.cashAmount || 0) + (entry.networkAmount || 0)) - (entry.purchasesAmount || 0);
      dailyMap[entry.date].entriesCount += 1;
    });
    const dailySummary = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // usersSummary: لكل مستخدم
    const users = await require('../models/User').find({});
    const userMap = {};
    entries.forEach(entry => {
      if (!userMap[entry.userId]) {
        const user = users.find(u => u._id.toString() === entry.userId.toString());
        userMap[entry.userId] = {
          userId: entry.userId,
          username: user?.username || '',
          isAdmin: user?.isAdmin || false,
          deductions: user?.deductions || 0,
          totalCash: 0,
          totalNetwork: 0,
          totalPurchases: 0,
          totalAdvances: 0,
          totalAmount: 0,
          totalRemaining: 0,
          activeDaysSet: new Set()
        };
      }
      userMap[entry.userId].totalCash += entry.cashAmount || 0;
      userMap[entry.userId].totalNetwork += entry.networkAmount || 0;
      userMap[entry.userId].totalPurchases += entry.purchasesAmount || 0;
      userMap[entry.userId].totalAdvances += entry.advanceAmount || 0;
      userMap[entry.userId].totalAmount += (entry.cashAmount || 0) + (entry.networkAmount || 0);
      userMap[entry.userId].activeDaysSet.add(entry.date);
    });
    // finalize user summary
    const usersSummary = Object.values(userMap).map(u => {
      u.totalAdvances = u.totalAdvances || 0;
      u.totalRemaining = u.totalAmount - u.totalPurchases - u.deductions;
      u.activeDays = u.activeDaysSet.size;
      delete u.activeDaysSet;
      return u;
    });

    // totals
    const totals = {
      totalCash: entries.reduce((sum, e) => sum + (e.cashAmount || 0), 0),
      totalNetwork: entries.reduce((sum, e) => sum + (e.networkAmount || 0), 0),
      totalPurchases: entries.reduce((sum, e) => sum + (e.purchasesAmount || 0), 0),
      totalAdvances: entries.reduce((sum, e) => sum + (e.advanceAmount || 0), 0) || 0,
    };
    totals.totalGross = totals.totalCash + totals.totalNetwork;
    totals.totalNet = totals.totalGross - totals.totalPurchases - totals.totalAdvances;

    res.json({ dailySummary, usersSummary, totals });
  } catch (error) {
    console.error('getAdminSummary error:', error);
    res.status(500).json({ message: 'Failed to get admin summary' });
  }
};

exports.getUsersMonthlyTotals = async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: 'year and month required' });
  const monthStr = String(month).padStart(2, '0');
  const dateRegex = new RegExp(`^${year}-${monthStr}`);
  const entries = await DailyEntry.find({ date: { $regex: dateRegex } });
  const userTotals = {};
  entries.forEach(e => {
    if (!userTotals[e.userId]) userTotals[e.userId] = 0;
    userTotals[e.userId] += (e.cashAmount || 0) + (e.networkAmount || 0);
  });
  res.json(userTotals);
};

exports.deleteAllEntriesForUser = async (req, res) => {
  const { userId } = req.params;
  await DailyEntry.deleteMany({ userId });
  res.json({ message: 'تم حذف جميع المدخلات' });
};

exports.getUserSummary = async (req, res) => {
  const { userId, year, month } = req.query;
  const monthStr = String(month).padStart(2, '0');
  const dateRegex = new RegExp(`^${year}-${monthStr}`);
  const entries = await DailyEntry.find({ userId, date: { $regex: dateRegex } });
  let totalCash = 0, totalNetwork = 0, totalPurchases = 0, totalAdvances = 0;
  entries.forEach(e => {
    totalCash += e.cashAmount || 0;
    totalNetwork += e.networkAmount || 0;
    totalPurchases += e.purchasesAmount || 0;
    totalAdvances += e.advanceAmount || 0;
  });
  const user = await require('../models/User').findById(userId);
  const deductions = user?.deductions || 0;
  const remaining = (totalCash + totalNetwork) - totalPurchases - deductions;
  res.json({ totalCash, totalNetwork, totalPurchases, totalAdvances, deductions, remaining });
};

module.exports = {
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
  getUsersMonthlyTotals: exports.getUsersMonthlyTotals,
  deleteAllEntriesForUser: exports.deleteAllEntriesForUser,
  getUserSummary: exports.getUserSummary
};