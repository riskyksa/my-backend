const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    // محاولة الحصول على التوكن من headers أولاً
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    // إذا لم يوجد في headers، جرب من FormData
    if (!token && req.body && req.body.token) {
      token = req.body.token;
    }

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'يجب تسجيل الدخول أولاً'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not set in environment');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'خطأ في إعدادات الخادم'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'الرمز غير صالح أو المستخدم غير موجود'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'الرمز غير صالح'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'انتهت صلاحية الرمز'
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'خطأ في المصادقة'
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'ليس لديك صلاحيات المدير'
    });
  }
  next();
};

const canAccessUser = (req, res, next) => {
  const targetUserId = req.params.userId || req.body.targetUserId;
  
  if (!targetUserId) {
    return next(); // No target user specified, continue
  }

  if (req.user.isAdmin) {
    return next();
  }

  if (req.user._id.toString() !== targetUserId) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'ليس لديك صلاحية لعرض هذه البيانات'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  canAccessUser
}; 