const mongoose = require('mongoose');

const trainingProgramSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    programCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    provider: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    durationWeeks: { type: Number, default: 0 },

    // The skills this program teaches. Each skill has a name + NSQF level so
    // we can match against Drive.requiredSkills and Skill.name later.
    taughtSkills: [
      {
        name: { type: String, required: true, trim: true },
        nsqfLevel: { type: String, trim: true, default: '' }
      }
    ],

    // Tech-alignment keywords — e.g. ["AI/ML", "Cloud Native", "Web3"].
    // Used by the AI service to score alignment with upcoming tech trends.
    techFocusAreas: [{ type: String, trim: true }],

    // Enrollment tracking — which students enrolled in this program
    enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'],
      default: 'ACTIVE'
    },

    // Cached AI analysis — recomputed on demand via the AI endpoint
    aiAnalysis: {
      techAlignmentScore: { type: Number, min: 0, max: 100, default: null },
      summary: { type: String, default: '' },
      recommendations: [{ type: String }],
      analyzedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TrainingProgram', trainingProgramSchema);
