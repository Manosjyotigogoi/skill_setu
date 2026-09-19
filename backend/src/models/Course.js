const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true }, // freeCodeCamp, Khan Academy, MIT OpenCourseWare, SWAYAM, edX, YouTube
    url: { type: String, required: true, trim: true },
    skills: { type: [String], default: [] },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
      default: 'Beginner'
    },
    duration: { type: String, trim: true, default: 'Self-paced' },
    free: { type: Boolean, default: true },
    freeStatus: { type: String, trim: true, default: '100% Free' },
    platform: { type: String, trim: true, default: '' },
    instructor: { type: String, trim: true, default: '' },
    credits: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 4.8 },
    enrolledCount: { type: Number, default: 0 },
    bridgesSkills: { type: [String], default: [] },
    accreditation: { type: String, trim: true, default: '' },
    badgeColor: { type: String, trim: true, default: 'neutral' }
  },
  { timestamps: true }
);

// Keep skills and bridgesSkills in sync for backwards compatibility
courseSchema.pre('save', function (next) {
  if (this.skills && this.skills.length > 0 && (!this.bridgesSkills || this.bridgesSkills.length === 0)) {
    this.bridgesSkills = this.skills;
  } else if (this.bridgesSkills && this.bridgesSkills.length > 0 && (!this.skills || this.skills.length === 0)) {
    this.skills = this.bridgesSkills;
  }
  if (!this.platform && this.provider) {
    this.platform = this.provider;
  }
  next();
});

module.exports = mongoose.model('Course', courseSchema);

