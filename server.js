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

// CORS - Allow all origins for Railway
app.use(cors({
  origin: '*',
  credentials: false
}));

// Create uploads directory if not exists
const uploadPath = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// أضف هذا السطر قبل تعريف الراوتات الأخرى
app.use('/uploads', express.static('uploads'));

// Health check endpoint - SIMPLE VERSION
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).send('OK');
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Freelance Daily Entries API',
    status: 'running'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/daily-entries', dailyEntriesRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server immediately
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  
  // Connect to MongoDB after server starts
  if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => {
        console.log('✅ Connected to MongoDB');
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        // Don't exit, let server run without DB
      });
  } else {
    console.log('⚠️ MONGODB_URI not set');
  }
});

module.exports = app;
