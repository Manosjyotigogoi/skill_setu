const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    score: { type: Number, min: 0, max: 100, required: true },
    category: { type: String, trim: true, default: 'General' },
    level: { type: String, trim: true, default: '' }, // e.g. "NSQF Level 7"
    verifiedBy: { type: String, trim: true, default: '' },
    verifiedDate: { type: Date, default: Date.now },
    credentialId: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ['VALIDATED', 'PENDING', 'REVOKED'],
      default: 'VALIDATED'
    },
    source: {
      type: String,
      enum: ['Proctored', 'Institutional Registry', 'Document Extraction'],
      default: 'Proctored'
    }
  },
  { timestamps: true }
);

skillSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Skill', skillSchema);
