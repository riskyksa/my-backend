const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const dailyEntriesRoutes = require('./routes/dailyEntries');
const adminRoutes = require('./routes/admin');

const app = express();

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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


// إعدادات CORS الصحيحة
app.use(cors({
  origin: ['http://localhost:5173', 'https://web-production-0f21.up.railway.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// هذا الكود يضيف الهيدرز المطلوبة لكل استجابة
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next();
});
// Create uploads directory if not exists
const uploadPath = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

app.use('/uploads', express.static('uploads'));

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
