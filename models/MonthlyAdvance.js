const mongoose = require('mongoose');

const monthlyAdvanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  yearMonth: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Validate YYYY-MM format
        return /^\d{4}-\d{2}$/.test(v);
      },
      message: 'YearMonth must be in YYYY-MM format'
    }
  },
  totalAdvances: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
monthlyAdvanceSchema.index({ userId: 1, yearMonth: 1 }, { unique: true });
monthlyAdvanceSchema.index({ userId: 1 });
monthlyAdvanceSchema.index({ yearMonth: 1 });

module.exports = mongoose.model('MonthlyAdvance', monthlyAdvanceSchema); 