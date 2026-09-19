const mongoose = require('mongoose');

// Quarterly employment check-in records.
//
// Every 4 months, the system sends an email to each student/trainee asking
// whether they are still employed. This model tracks each check-in cycle,
// when the email was sent, when (if ever) the student responded, and what
// their current employment status is.
//
// Admin can view all check-ins across all candidates to track outcomes over
// time. If a student responds "looking for new opportunities", the admin can
// refer them to companies with matching open drives.

const checkInSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Which quarterly cycle this check-in belongs to. Format: "Q1-2026"
    cycle: { type: String, required: true, trim: true },

    // When the email was dispatched to the student
    emailSentAt: { type: Date, default: Date.now },

    // When the student actually responded (null = no response yet)
    respondedAt: { type: Date, default: null },

    // The student's self-reported employment status at the time of response
    currentEmploymentStatus: {
      type: String,
      enum: ['EMPLOYED', 'OPEN_TO_WORK', 'NOT_LOOKING', null],
      default: null
    },

    // If the student is currently employed, capture details
    currentCompany: { type: String, trim: true, default: '' },
    currentRole: { type: String, trim: true, default: '' },
    currentPackage: { type: String, trim: true, default: '' },

    // If the student wants to be referred for new opportunities
    wantsReferral: { type: Boolean, default: false },

    // Free-text notes the student can add
    notes: { type: String, trim: true, default: '' },

    // Admin-side: did the admin act on this check-in?
    adminActionTaken: {
      type: String,
      enum: ['NONE', 'REFERRED', 'CONTACTED', 'RESOLVED'],
      default: 'NONE'
    },
    adminNotes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

checkInSchema.index({ user: 1, cycle: 1 }, { unique: true });

module.exports = mongoose.model('EmploymentCheckIn', checkInSchema);
