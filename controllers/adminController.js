const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const DailyEntry = require('../models/DailyEntry');
const MonthlyAdvance = require('../models/MonthlyAdvance');
const Deduction = require('../models/Deduction');

const getAllUsers = async (req, res) => {
  try {
    console.log('Getting all users...');

    // التحقق من اتصال قاعدة البيانات
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected');
      return res.status(503).json({
        error: 'Database not available',
        message: 'قاعدة البيانات غير متاحة'
      });
    }

    const users = await User.find({ isActive: true })
      .select('-password')
      .sort({ username: 1 });

    console.log(`Found ${users.length} active users`);

    // إذا لم يكن هناك مستخدمين، إنشاء مستخدم تجريبي
    if (users.length === 0) {
      console.log('No users found, creating test user...');

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('123456', 12);

      const testUser = new User({
        email: 'admin@test.com',
        password: hashedPassword,
        username: 'admin',
        isAdmin: true,
        isActive: true
      });

      await testUser.save();
      console.log('Test user created successfully');

      // إعادة جلب المستخدمين
      const updatedUsers = await User.find({ isActive: true })
        .select('-password')
        .sort({ username: 1 });

      res.json({
        users: updatedUsers,
        count: updatedUsers.length
      });
    } else {
      res.json({
        users,
        count: users.length
      });
    }

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      message: 'فشل في جلب المستخدمين',
      details: error.message
    });
  }
};

const updateUserDeductions = async (req, res) => {
  try {
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

const updateUsername = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'بيانات غير صحيحة',
        details: errors.array()
      });
    }

    const { userId, newUsername } = req.body;

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

// ====== تمت الإضافة هنا ======

const updateUserEmail = async (req, res) => {
  try {
    const { userId, newEmail } = req.body;

    const existingUser = await User.findOne({
      email: newEmail,
      _id: { $ne: userId }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Email taken',
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    user.email = newEmail;
    await user.save();

    res.json({
      message: 'تم تحديث البريد الإلكتروني بنجاح',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({
      error: 'Failed to update email',
      message: 'فشل في تحديث البريد الإلكتروني'
    });
  }
};

const updateUserPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    user.password = newPassword; // سيقوم pre-save hook بالتشفير تلقائيًا
    await user.save();


    res.json({
      message: 'تم تحديث كلمة المرور بنجاح'
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      error: 'Failed to update password',
      message: 'فشل في تحديث كلمة المرور'
    });
  }
};

// ====== نهاية الإضافة ======

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

    await DailyEntry.deleteMany({ userId });

    await MonthlyAdvance.deleteMany({ userId });

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


const completeSystemReset = async (req, res) => {
  try {
    const { confirmationText } = req.body;

    if (confirmationText !== 'تصفير كامل') {
      return res.status(400).json({
        error: 'Invalid confirmation',
        message: 'نص التأكيد غير صحيح'
      });
    }

    const adminUserId = req.user._id;

    await DailyEntry.deleteMany({});

    await MonthlyAdvance.deleteMany({});

    await User.updateMany(
      { _id: { $ne: adminUserId } },
      { isActive: false }
    );

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

const getSystemStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalEntries = await DailyEntry.countDocuments();
    const totalAdvances = await MonthlyAdvance.countDocuments();

    const recentEntries = await DailyEntry.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'username');

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

const getMonthlySummary = async (req, res) => {
  const { year, month } = req.query;
  const monthStr = String(month).padStart(2, '0');
  const entries = await require('../models/DailyEntry').find({
    date: { $regex: `^${year}-${monthStr}` }
  });

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

const resetDataOnly = async (req, res) => {
  const { confirmationText } = req.body;
  if (confirmationText !== 'تصفير البيانات') {
    return res.status(400).json({ message: 'كلمة التأكيد غير صحيحة' });
  }
  await require('../models/DailyEntry').deleteMany({});
  await require('../models/MonthlyAdvance').deleteMany({});
  res.json({ message: 'تم تصفير البيانات المالية بنجاح' });
};

const getAdminSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ message: 'year and month are required' });
    }
    const monthStr = String(month).padStart(2, '0');
    const dateRegex = new RegExp(`^${year}-${monthStr}`);

    const entries = await require('../models/DailyEntry').find({ date: { $regex: dateRegex } });
    console.log(`[getAdminSummary] year=${year}, month=${month}, entries found:`, entries.length);

    if (!entries || entries.length === 0) {
      return res.json({
        dailySummary: [],
        usersSummary: [],
        totals: {
          totalCash: 0,
          totalNetwork: 0,
          totalPurchases: 0,
          totalAdvances: 0,
          totalGross: 0,
          totalNet: 0,
          activeDays: 0,
          activeUsers: 0,
          averageDailyAmount: 0,
          daysInMonth: new Date(parseInt(year), parseInt(month), 0).getDate()
        },
        message: 'لا توجد بيانات مالية لهذا الشهر.'
      });
    }

    // جلب المستخدمين النشطين فقط
    const users = await require('../models/User').find({ isActive: true });
    const activeUserIds = new Set(users.map(u => u._id.toString()));
    // entries لمستخدمين نشطين فقط
    const filteredEntries = entries.filter(e => activeUserIds.has(e.userId.toString()));

    const dailyMap = {};
    filteredEntries.forEach(entry => {
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

    const userMap = {};
    filteredEntries.forEach(entry => {
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
    const usersSummary = Object.values(userMap).map(u => {
      u.totalAdvances = u.totalAdvances || 0;
      u.totalRemaining = u.totalAmount - u.totalPurchases - u.deductions;
      u.activeDays = u.activeDaysSet.size;
      delete u.activeDaysSet;
      return u;
    });

    const totals = {
      totalCash: filteredEntries.reduce((sum, e) => sum + (e.cashAmount || 0), 0),
      totalNetwork: filteredEntries.reduce((sum, e) => sum + (e.networkAmount || 0), 0),
      totalPurchases: filteredEntries.reduce((sum, e) => sum + (e.purchasesAmount || 0), 0),
      totalAdvances: filteredEntries.reduce((sum, e) => sum + (e.advanceAmount || 0), 0) || 0,
    };
    totals.totalGross = totals.totalCash + totals.totalNetwork;
    totals.totalNet = totals.totalGross - totals.totalPurchases - totals.totalAdvances;

    // Active days: عدد الأيام الفريدة التي بها إدخالات لمستخدمين نشطين
    const uniqueActiveDays = new Set(filteredEntries.map(e => e.date));
    totals.activeDays = uniqueActiveDays.size;
    // Active users: عدد المستخدمين النشطين الذين لديهم إدخالات
    const uniqueActiveUsers = new Set(filteredEntries.map(e => e.userId.toString()));
    totals.activeUsers = uniqueActiveUsers.size;
    // Average daily amount: totalGross / activeDays
    totals.averageDailyAmount = totals.activeDays > 0 ? Math.round(totals.totalGross / totals.activeDays) : 0;
    // Days in month
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    totals.daysInMonth = (!isNaN(yearNum) && !isNaN(monthNum)) ? new Date(yearNum, monthNum, 0).getDate() : 0;

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

// إضافة خصمية جديدة لمستخدم
exports.addDeduction = async (req, res) => {
  try {
    console.log('=== ADD DEDUCTION DEBUG ===');
    console.log('Received deduction request:', req.body);
    const { userId, amount, reason, date } = req.body;
    console.log('Parsed data:', { userId, amount, reason, date, types: { userId: typeof userId, amount: typeof amount, reason: typeof reason, date: typeof date } });

    // تحويل البيانات إلى الأنواع الصحيحة
    const parsedAmount = parseFloat(amount);
    const trimmedReason = String(reason).trim();

    console.log('Processed data:', { userId, parsedAmount, trimmedReason });

    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return res.status(400).json({
        error: 'Invalid userId',
        message: 'معرف المستخدم غير صحيح'
      });
    }
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'المبلغ غير صحيح'
      });
    }
    if (!reason || trimmedReason.length < 3) {
      return res.status(400).json({
        error: 'Invalid reason',
        message: 'السبب غير صحيح'
      });
    }

    // التحقق من وجود المستخدم
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    const Deduction = require('../models/Deduction');
    const deduction = new Deduction({
      userId,
      amount: parsedAmount,
      reason: trimmedReason,
      date: date ? new Date(date) : new Date()
    });

    console.log('Saving deduction:', deduction);
    await deduction.save();

    console.log('Deduction saved successfully');
    res.json({
      message: 'تمت إضافة الخصمية بنجاح',
      deduction
    });
  } catch (error) {
    console.error('Add deduction error:', error);
    res.status(500).json({
      error: 'Failed to add deduction',
      message: 'فشل في إضافة الخصمية',
      details: error.message
    });
  }
};

exports.updateUserAdvances = async (req, res) => {
  try {
    console.log('=== UPDATE USER ADVANCES DEBUG ===');
    console.log('Received request body:', req.body);

    const { userId, advances } = req.body;

    console.log('Parsed data:', { userId, advances, types: { userId: typeof userId, advances: typeof advances } });

    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      return res.status(400).json({
        error: 'Invalid userId',
        message: 'معرف المستخدم غير صحيح'
      });
    }

    const parsedAdvances = parseFloat(advances);
    if (isNaN(parsedAdvances) || parsedAdvances < 0) {
      return res.status(400).json({
        error: 'Invalid advances amount',
        message: 'مبلغ السلفيات غير صحيح'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'المستخدم غير موجود'
      });
    }

    // تحديث السلفيات في جدول MonthlyAdvance
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const yearMonth = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;

    console.log('Updating advances for:', { userId, yearMonth, advances: parsedAdvances });

    const updatedAdvance = await MonthlyAdvance.findOneAndUpdate(
      { userId, yearMonth },
      { totalAdvances: parsedAdvances },
      { upsert: true, new: true }
    );

    console.log('Advance updated successfully:', updatedAdvance);

    // إضافة headers لمنع الكاش
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      message: 'تم تحديث السلفيات بنجاح',
      user: user.toJSON(),
      updatedAdvance
    });

  } catch (error) {
    console.error('Update user advances error:', error);
    res.status(500).json({
      error: 'Failed to update advances',
      message: 'فشل في تحديث السلفيات',
      details: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  updateUserDeductions,
  updateUsername,
  updateUserEmail,
  updateUserPassword,
  deleteUser,
  completeSystemReset,
  getSystemStats,
  toggleAdminStatus,
  getMonthlySummary,
  resetDataOnly,
  getAdminSummary,
  getUsersMonthlyTotals: exports.getUsersMonthlyTotals,
  deleteAllEntriesForUser: exports.deleteAllEntriesForUser,
  getUserSummary: exports.getUserSummary,
  addDeduction: exports.addDeduction,
  updateUserAdvances: exports.updateUserAdvances
};