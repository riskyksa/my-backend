const mongoose = require('mongoose');

const dailyEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Validate YYYY-MM-DD format
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'Date must be in YYYY-MM-DD format'
    }
  },
  cashAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  networkAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  purchasesAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  advanceAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  total: {
    type: Number,
    default: 0,
    min: 0
  },
  remaining: {
    type: Number,
    default: 0
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number
  }]
}, {
  timestamps: true
});

// Calculate total and remaining before saving
dailyEntrySchema.pre('save', function(next) {
  this.total = (this.cashAmount || 0) + (this.networkAmount || 0);
  this.remaining = this.total - (this.purchasesAmount || 0);
  next();
});

// Indexes for better query performance
dailyEntrySchema.index({ userId: 1, date: 1 }, { unique: true });
dailyEntrySchema.index({ userId: 1 });
dailyEntrySchema.index({ date: 1 });

// Virtual for year-month
dailyEntrySchema.virtual('yearMonth').get(function() {
  return this.date ? this.date.substring(0, 7) : null;
});

// Ensure virtuals are included in JSON
dailyEntrySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('DailyEntry', dailyEntrySchema); 