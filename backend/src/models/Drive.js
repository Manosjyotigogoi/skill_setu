const mongoose = require('mongoose');

const driveSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    company: { type: String, required: true, trim: true },
    logoInitials: { type: String, trim: true, default: '' },
    role: { type: String, required: true, trim: true },
    type: { type: String, trim: true, default: 'Full-Time Placement' },
    location: { type: String, trim: true, default: '' },
    ctc: { type: String, trim: true, default: '' }, // display string, e.g. "₹9.2 - 12.0 LPA"
    ctcMinLpa: { type: Number, default: 0 },
    ctcMaxLpa: { type: Number, default: 0 },
    eligibilityCgpa: { type: Number, default: 0 },
    deadline: { type: Date },
    driveDate: { type: Date },
    rounds: { type: String, trim: true, default: '' },
    requiredSkills: { type: [String], default: [] }, // used to compute match/missing skills per candidate
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Drive', driveSchema);
