const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path'); // Added for path.join
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dailyEntriesRoutes = require('./routes/dailyEntries');
const adminRoutes = require('./routes/admin');

const app = express();

// إعدادات CORS (يجب أن تكون في الأعلى وقبل أي راوتر)
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = ['http://localhost:5173', 'https://web-production-0f21.up.railway.app'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
}));

// إضافة الهيدرز المطلوبة لكل استجابة ومعالجة OPTIONS
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:5173', 'https://web-production-0f21.up.railway.app'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Debug middleware for all requests
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  if (req.method === 'POST') {
    console.log('📝 POST request detected');
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    if (req.url === '/api/daily-entries/create') {
      console.log('🎯 Daily entry creation request detected');
    }
  }
  next();
});

// Basic middleware - تعامل مع FormData أولاً
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// middleware ذكي للتعامل مع JSON و FormData
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  if (req.method === 'POST' && contentType.includes('multipart/form-data')) {
    console.log('📁 FormData detected, skipping JSON parsing');
    next();
  } else if (contentType.includes('application/json')) {
    console.log('📄 JSON detected, parsing with express.json()');
    express.json({ limit: '10mb' })(req, res, next);
  } else {
    console.log('🔧 No specific content-type, using default parsing');
    next();
  }
});

// Debug middleware for JSON parsing
app.use((req, res, next) => {
  if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
    console.log('=== SERVER JSON DEBUG ===');
    console.log('JSON request detected');
    console.log('URL:', req.url);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request body type:', typeof req.body);
    console.log('Request body keys:', Object.keys(req.body || {}));
  }
  next();
});

// Create uploads directory if not exists
const uploadPath = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// إعداد static files للملفات المرفوعة
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    // إضافة headers للصور
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/' + path.split('.').pop());
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // cache لمدة سنة
    }
    // إضافة CORS headers للملفات
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  },
  fallthrough: false // عدم السماح بالخطأ في حالة عدم وجود الملف
}));

// إضافة middleware لمعالجة أخطاء الملفات
app.use('/uploads', (req, res, next) => {
  console.log(`📁 File request: ${req.url}`);
  const filePath = path.join(process.env.UPLOAD_PATH || './uploads', req.url);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return res.status(404).json({ error: 'File not found' });
  }
  next();
});

app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      origin: req.headers.origin,
      method: req.method
    }
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Freelance Daily Entries API',
    status: 'running',
    timestamp: new Date().toISOString(),
    cors: {
      origin: req.headers.origin,
      method: req.method
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/daily-entries', dailyEntriesRoutes);
app.use('/api/admin', adminRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  
  // التحقق من المتغيرات المطلوبة
  if (!process.env.JWT_SECRET) {
    console.log('⚠️ JWT_SECRET not set, using default for development');
    process.env.JWT_SECRET = 'dev-secret-key-change-in-production';
  }
  
  if (!process.env.MONGODB_URI) {
    console.log('⚠️ MONGODB_URI not set, using default local MongoDB');
    process.env.MONGODB_URI = 'mongodb://localhost:27017/freelance_db';
  }
  
  if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => {
        console.log('✅ Connected to MongoDB');
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        console.log('⚠️ Server will continue without database connection');
      });
  } else {
    console.log('⚠️ MONGODB_URI not set');
  }
});

module.exports = app;
