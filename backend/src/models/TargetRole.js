const mongoose = require('mongoose');

const requiredSkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    requiredScore: { type: Number, min: 0, max: 100, default: 70 }
  },
  { _id: false }
);

const targetRoleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    tier: { type: String, trim: true, default: '' },
    targetReadiness: { type: Number, min: 0, max: 100, default: 80 },
    requiredSkills: { type: [requiredSkillSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TargetRole', targetRoleSchema);
