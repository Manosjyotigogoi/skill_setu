const mongoose = require('mongoose');

const placementRecordSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    trainingProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingProgram', index: true },
    drive: { type: mongoose.Schema.Types.ObjectId, ref: 'Drive' },
    company: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: '' },
    packageLpa: { type: Number, min: 0, required: true },
    placedAt: { type: Date, default: Date.now },
    lastVerifiedAt: { type: Date },
    currentStatus: { type: String, enum: ['placed', 'still_employed', 'changed_employer', 'unemployed'], default: 'placed' },
    currentCompany: { type: String, trim: true, default: '' },
    currentPackageLpa: { type: Number, min: 0 },
    // 1-Year Retention / Follow-up Tracking
    oneYearStatus: {
      type: String,
      enum: ['pending', 'still_at_company', 'changed_company', 'unemployed'],
      default: 'pending'
    },
    oneYearCheckDate: { type: Date },
    oneYearVerifiedAt: { type: Date },
    oneYearNotes: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlacementRecord', placementRecordSchema);
