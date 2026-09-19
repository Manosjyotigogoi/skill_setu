const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive', required: true, index: true },
    status: {
      type: String,
      enum: ['Applied', 'Shortlisted', 'Rejected', 'Selected'],
      default: 'Applied'
    },
    applicationStatus: { type: String, trim: true, default: 'Applied with Skill-Setu Sovereign Passport' },
    appliedAt: { type: Date, default: Date.now }
    ,interviewDate: { type: Date }
  },
  { timestamps: true }
);

applicationSchema.index({ user: 1, drive: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);
