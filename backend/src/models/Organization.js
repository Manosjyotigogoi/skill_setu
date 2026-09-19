const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['university', 'government'], required: true, index: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    joinCode: { type: String, trim: true, uppercase: true },
    joinCodeHash: { type: String, required: true, select: false },
    joinCodeLastRotatedAt: { type: Date, default: Date.now },
    contactEmail: { type: String, trim: true, lowercase: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
