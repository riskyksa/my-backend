const mongoose = require('mongoose');

const deductionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// إنشاء index للبحث السريع
deductionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Deduction', deductionSchema); 