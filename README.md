# 🚀 Backend API - Railway Ready

## 📋 الوصف
Backend API لنظام إدارة المدخلات اليومية، مُحسّن للنشر على Railway.

## 🚀 النشر على Railway

### 1. **إنشاء مشروع على Railway**
```bash
# اذهب إلى https://railway.app/
# اربط GitHub repository
# اختر مجلد backend كـ Root Directory
```

### 2. **إعداد Environment Variables**
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
CORS_ORIGIN=https://your-frontend-domain.com
```

### 3. **إضافة MongoDB Service**
- في Railway، اضغط **"New Service"**
- اختر **"Database"** → **"MongoDB"**
- انسخ `MONGODB_URI` وأضفه للـ Environment Variables

## 🔧 التطوير المحلي

### تثبيت التبعيات
```bash
npm install
```

### تشغيل الخادم
```bash
# للتطوير
npm run dev

# للإنتاج
npm start
```

## 🔌 API Endpoints

### المصادقة
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول
- `GET /api/auth/profile` - جلب الملف الشخصي
- `PUT /api/auth/profile` - تحديث الملف الشخصي
- `PUT /api/auth/change-password` - تغيير كلمة المرور

### المدخلات اليومية
- `GET /api/daily-entries` - جلب المدخلات
- `POST /api/daily-entries` - إنشاء مدخل جديد
- `PUT /api/daily-entries/:id` - تحديث مدخل
- `DELETE /api/daily-entries/:id` - حذف مدخل
- `GET /api/daily-entries/monthly-advances` - السلفيات الشهرية
- `GET /api/daily-entries/stats` - الإحصائيات

### إدارة المستخدمين (للمدير)
- `GET /api/admin/users` - جلب جميع المستخدمين
- `PUT /api/admin/users/deductions` - تحديث الخصميات
- `PUT /api/admin/users/username` - تحديث اسم المستخدم
- `DELETE /api/admin/users/:id` - حذف مستخدم
- `POST /api/admin/system-reset` - تصفير النظام
- `GET /api/admin/stats` - إحصائيات النظام

## 🔍 اختبار API

### Health Check
```bash
curl https://your-railway-app.railway.app/api/health
```

### تسجيل مستخدم
```bash
curl -X POST https://your-railway-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","username":"testuser"}'
```

## 📁 هيكل المشروع
```
backend/
├── controllers/     # API Controllers
├── models/         # Mongoose Models
├── routes/         # Express Routes
├── middleware/     # Auth & Upload
├── uploads/        # Uploaded Files
├── server.js       # Main server
├── package.json    # Dependencies
├── Procfile        # Railway deployment
├── railway.json    # Railway config
└── .env           # Environment variables
```

## 🔒 الأمان
- JWT Authentication
- Password Hashing (bcrypt)
- Input Validation
- File Upload Security
- Rate Limiting
- CORS Protection

## 📊 المراقبة
- Health Check endpoint
- Error logging
- Request logging
- Performance monitoring

## 🚨 حل المشاكل
- راجع Railway logs
- تأكد من Environment Variables
- تحقق من MongoDB connection
- تأكد من CORS settings 