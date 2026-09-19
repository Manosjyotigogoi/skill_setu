const crypto = require('crypto');

const User = require('../models/User');
const Skill = require('../models/Skill');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('../utils/asyncHandler');

// Produces an HMAC-SHA256 signature over the candidate's key credential
// facts. This is a lightweight stand-in for a real digital-signature /
// PKI flow (e.g. an eSign/DSC-backed certificate) — good enough to prove
// the dossier wasn't tampered with client-side, not a legal e-signature.
function signDossier(payload) {
  const secret = process.env.DOSSIER_SIGNING_SECRET || process.env.JWT_SECRET;
  const message = JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// GET /api/dossier/me
const getMyDossier = asyncHandler(async (req, res) => {
  const [skills, enrollments] = await Promise.all([
    Skill.find({ user: req.user._id, status: 'VALIDATED' }).sort({ verifiedDate: -1 }),
    Enrollment.find({ user: req.user._id, enrolled: true }).populate('course')
  ]);

  const signaturePayload = {
    skillSetuId: req.user.skillSetuId,
    name: req.user.name,
    verifiedSkillsCount: skills.length,
    sovereignStatus: req.user.sovereignStatus,
    issuedAt: new Date().toISOString()
  };

  res.json({
    profile: req.user.toPublicProfile(),
    skills,
    enrolledCourses: enrollments.map((e) => ({
      course: e.course,
      progress: e.progress
    })),
    signature: signDossier(signaturePayload),
    issuedAt: signaturePayload.issuedAt
  });
});

// GET /api/dossier/verify/:skillSetuId — public, no auth. What a recruiter hits.
const verifyDossier = asyncHandler(async (req, res) => {
  const user = await User.findOne({ skillSetuId: req.params.skillSetuId });
  if (!user) {
    return res.status(404).json({ verified: false, message: 'No credential found for that Skill-Setu ID.' });
  }

  const verifiedSkillsCount = await Skill.countDocuments({ user: user._id, status: 'VALIDATED' });

  res.json({
    verified: user.sovereignStatus === 'VERIFIED_LINKED',
    candidate: {
      name: user.name,
      skillSetuId: user.skillSetuId,
      degree: user.degree,
      institution: user.institution,
      nsqfLevel: user.nsqfLevel,
      verifiedSkillsCount
    }
  });
});

module.exports = { getMyDossier, verifyDossier };
