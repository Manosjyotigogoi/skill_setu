const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SETTINGS_DEFAULTS = {
  autoSyncDigilocker: true,
  recruiterVisibility: true,
  emailAlerts: true,
  smsAlerts: false
};

const userSchema = new mongoose.Schema(
  {
    // Identity
    name: { type: String, required: true, trim: true },
    hindiName: { type: String, trim: true, default: '' },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    passwordHash: { type: String, select: false },

    role: {
      type: String,
      enum: ['student', 'trainee', 'university_admin', 'government_admin', 'admin'],
      default: 'student',
      required: true
    },

    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    trainingProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingProgram', index: true },
    trainingProgramCode: { type: String, trim: true, uppercase: true },

    // Academic / national identifiers
    rollNo: { type: String, trim: true, default: '' },
    branch: { type: String, trim: true, default: '' },
    aicteId: { type: String, trim: true, default: '' },
    regId: { type: String, trim: true, default: '' },
    skillSetuId: { type: String, unique: true, sparse: true },
    sovereignStatus: {
      type: String,
      enum: ['UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED_LINKED'],
      default: 'PENDING_VERIFICATION'
    },
    degree: { type: String, trim: true, default: '' },
    academicYear: { type: String, trim: true, default: '' },
    institution: { type: String, trim: true, default: '' },
    cgpa: { type: Number, min: 0, max: 10, default: 0 },

    // Readiness / dashboard cached figures (recomputed as skills/exams change)
    readinessScore: { type: Number, min: 0, max: 100, default: 0 },
    nsqfLevel: { type: String, trim: true, default: '' },
    nationalRankingPercentile: { type: Number, min: 0, max: 100, default: 0 },
    verifiedSkillsCount: { type: Number, default: 0 },
    pendingExamsCount: { type: Number, default: 0 },

    // Employment
    employmentStatus: {
      type: String,
      enum: ['Open to Work', 'Employed', 'Not Looking'],
      default: 'Open to Work'
    },
    employmentSummary: { type: String, trim: true, default: '' },
    currentCompany: { type: String, trim: true, default: '' },
    currentRole: { type: String, trim: true, default: '' },
    currentPackage: { type: String, trim: true, default: '' },
    experienceYears: { type: Number, min: 0, default: 0 },

    avatarUrl: { type: String, trim: true, default: '' },

    // Free-text list of courses the student has already completed — collected
    // at signup so the AI can personalize recommendations.
    priorCourses: [{ type: String, trim: true }],

    // Free-text list of skills the student already has (self-reported at
    // signup). Merged with server-verified skills for AI personalization.
    selfReportedSkills: [{ type: String, trim: true, maxlength: 100 }],

    // Preferred job locations for AI matching
    preferredJobLocations: [{ type: String, trim: true, maxlength: 100 }],
    whatsappOptIn: { type: Boolean, default: false },

    // User's targeted career roles
    targetRoleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TargetRole', default: [] }],

    settings: {
      type: {
        autoSyncDigilocker: { type: Boolean, default: true },
        recruiterVisibility: { type: Boolean, default: true },
        emailAlerts: { type: Boolean, default: true },
        smsAlerts: { type: Boolean, default: false }
      },
      default: SETTINGS_DEFAULTS
    }
  },
  { timestamps: true }
);

userSchema.pre('validate', function requireIdentifier(next) {
  if (!this.email && !this.phone) {
    return next(new Error('At least one of email or phone is required.'));
  }
  next();
});

userSchema.methods.setPassword = async function setPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

userSchema.methods.comparePassword = async function comparePassword(plainPassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Public-facing shape (what we ever send to the frontend)
userSchema.methods.toPublicProfile = function toPublicProfile() {
  return {
    id: this._id,
    name: this.name,
    hindiName: this.hindiName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    organization: this.organization,
    trainingProgram: this.trainingProgram,
    trainingProgramCode: this.trainingProgramCode,
    rollNo: this.rollNo,
    branch: this.branch,
    aicteId: this.aicteId,
    regId: this.regId,
    skillSetuId: this.skillSetuId,
    sovereignStatus: this.sovereignStatus,
    degree: this.degree,
    academicYear: this.academicYear,
    institution: this.institution,
    cgpa: this.cgpa,
    readinessScore: this.readinessScore,
    nsqfLevel: this.nsqfLevel,
    nationalRankingPercentile: this.nationalRankingPercentile,
    verifiedSkillsCount: this.verifiedSkillsCount,
    pendingExamsCount: this.pendingExamsCount,
    employmentStatus: this.employmentStatus,
    employmentSummary: this.employmentSummary,
    currentCompany: this.currentCompany,
    currentRole: this.currentRole,
    currentPackage: this.currentPackage,
    experienceYears: this.experienceYears,
    avatarUrl: this.avatarUrl,
    priorCourses: this.priorCourses || [],
    selfReportedSkills: this.selfReportedSkills || [],
    preferredJobLocations: this.preferredJobLocations || [],
    targetRoleIds: (this.targetRoleIds || []).map((r) => (r && r._id ? r._id.toString() : r.toString())),
    whatsappOptIn: this.whatsappOptIn,
    qrTargetUrl: process.env.QR_PLACEHOLDER_URL || undefined,
    settings: this.settings,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
