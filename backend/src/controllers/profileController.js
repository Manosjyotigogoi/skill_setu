const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');

// Fields the student/trainee is allowed to self-edit. Government-issued
// identifiers (aicteId, regId, skillSetuId, rollNo) and cached scores are
// deliberately excluded — those come from institutional verification flows.
const EDITABLE_FIELDS = [
  'name',
  'hindiName',
  'email',
  'phone',
  'branch',
  'degree',
  'academicYear',
  'institution',
  'cgpa',
  'employmentStatus',
  'employmentSummary',
  'currentCompany',
  'currentRole',
  'currentPackage',
  'experienceYears',
  'avatarUrl',
  'priorCourses',
  'selfReportedSkills',
  'preferredJobLocations',
  'targetRoleIds'
];

const SETTINGS_FIELDS = ['autoSyncDigilocker', 'recruiterVisibility', 'emailAlerts', 'smsAlerts'];
const LIST_FIELD_LIMITS = {
  selfReportedSkills: { maxItems: 50, maxLength: 100 },
  preferredJobLocations: { maxItems: 20, maxLength: 100 }
};

function normalizeProfileList(field, value) {
  const { maxItems, maxLength } = LIST_FIELD_LIMITS[field];
  if (!Array.isArray(value)) {
    return { error: `${field} must be an array of non-empty strings.` };
  }

  if (value.some((item) => typeof item !== 'string' || !item.trim() || item.trim().length > maxLength)) {
    return { error: `${field} must contain only non-empty strings of at most ${maxLength} characters.` };
  }

  const normalized = [...new Set(value.map((item) => item.trim()))];
  if (normalized.length > maxItems) {
    return { error: `${field} cannot contain more than ${maxItems} values.` };
  }

  return { value: normalized };
}

// GET /api/profile/me
const getMyProfile = asyncHandler(async (req, res) => {
  // If user has 0 verified skills, ensure cached readinessScore is 0 (heals legacy default of 30)
  if (req.user.verifiedSkillsCount === 0 && req.user.readinessScore !== 0) {
    req.user.readinessScore = 0;
    await req.user.save();
  }
  res.json({ profile: req.user.toPublicProfile() });
});

// PATCH /api/profile/me
const updateMyProfile = asyncHandler(async (req, res) => {
  const normalizedLists = {};
  for (const field of Object.keys(LIST_FIELD_LIMITS)) {
    if (req.body[field] !== undefined) {
      const result = normalizeProfileList(field, req.body[field]);
      if (result.error) return res.status(400).json({ message: result.error });
      normalizedLists[field] = result.value;
    }
  }

  if (req.body.targetRoleIds !== undefined) {
    if (!Array.isArray(req.body.targetRoleIds)) {
      return res.status(400).json({ message: 'targetRoleIds must be an array of role IDs.' });
    }
    const validIds = req.body.targetRoleIds
      .filter((id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id.trim()))
      .map((id) => id.trim());
    req.user.targetRoleIds = [...new Set(validIds)];
  }

  EDITABLE_FIELDS.forEach((field) => {
    if (field === 'targetRoleIds') return;
    if (req.body[field] !== undefined) {
      req.user[field] = normalizedLists[field] || req.body[field];
    }
  });

  await req.user.save();
  res.json({ profile: req.user.toPublicProfile() });
});

// PATCH /api/profile/settings
const updateSettings = asyncHandler(async (req, res) => {
  const next = { ...req.user.settings };
  SETTINGS_FIELDS.forEach((field) => {
    if (typeof req.body[field] === 'boolean') {
      next[field] = req.body[field];
    }
  });

  req.user.settings = next;
  await req.user.save();
  res.json({ settings: req.user.settings });
});

module.exports = { getMyProfile, updateMyProfile, updateSettings };
