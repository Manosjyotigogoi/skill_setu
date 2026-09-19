const User = require('../models/User');
const Skill = require('../models/Skill');
const Drive = require('../models/Drive');
const Application = require('../models/Application');
const asyncHandler = require('../utils/asyncHandler');

function badgeForStatus(sovereignStatus) {
  return sovereignStatus === 'VERIFIED_LINKED' ? 'VERIFIED_SOVEREIGN' : 'PENDING_VERIFICATION';
}

async function placementSummaryFor(userId) {
  const applications = await Application.find({ user: userId }).populate('drive', 'company');

  const offersCount = applications.filter((a) => a.status === 'Selected').length;
  const shortlistsCount = applications.filter((a) => a.status === 'Shortlisted').length;

  let placementStatus = 'Not Yet Active';
  const selected = applications.find((a) => a.status === 'Selected');
  if (selected) {
    placementStatus = `Placed (${selected.drive ? selected.drive.company : 'Company'})`;
  } else if (applications.length > 0) {
    placementStatus = 'In Active Drives';
  }

  return { offersCount, shortlistsCount, placementStatus };
}

// GET /api/admin/roster
const getRoster = asyncHandler(async (req, res) => {
  const students = await User.find({ role: { $in: ['student', 'trainee'] } }).sort({ createdAt: -1 });

  const roster = await Promise.all(
    students.map(async (student) => {
      const [skillsVerified, placement] = await Promise.all([
        Skill.countDocuments({ user: student._id, status: 'VALIDATED' }),
        placementSummaryFor(student._id)
      ]);

      return {
        id: student._id,
        name: student.name,
        rollNo: student.rollNo,
        branch: student.branch,
        cgpa: student.cgpa,
        skillsVerified,
        readinessScore: student.readinessScore,
        placementStatus: placement.placementStatus,
        offersCount: placement.offersCount,
        shortlistsCount: placement.shortlistsCount,
        verificationBadge: badgeForStatus(student.sovereignStatus)
      };
    })
  );

  res.json({ roster });
});

// POST /api/admin/roster/:id/approve — signs off a student's credentials
const approveStudentCredentials = asyncHandler(async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found.' });

  student.sovereignStatus = 'VERIFIED_LINKED';
  await student.save();

  res.json({
    message: 'Student credentials verified and signed with institutional sovereign seal.',
    verificationBadge: badgeForStatus(student.sovereignStatus)
  });
});

// GET /api/admin/telemetry — all figures computed live from the DB
const getTelemetry = asyncHandler(async (req, res) => {
  const [
    totalEligibleStudents,
    activeCampusDrives,
    totalVerifiedCredentials,
    distinctCompanies,
    selectedApplications
  ] = await Promise.all([
    User.countDocuments({ role: { $in: ['student', 'trainee'] } }),
    Drive.countDocuments({ status: 'OPEN' }),
    Skill.countDocuments({ status: 'VALIDATED' }),
    Drive.distinct('company'),
    Application.find({ status: 'Selected' }).populate('drive', 'ctcMaxLpa')
  ]);

  const placedStudentIds = new Set(selectedApplications.map((a) => a.user.toString()));
  const placedPercentage = totalEligibleStudents
    ? Number(((placedStudentIds.size / totalEligibleStudents) * 100).toFixed(1))
    : 0;

  const ctcValues = selectedApplications
    .map((a) => (a.drive ? a.drive.ctcMaxLpa : 0))
    .filter((v) => v > 0);

  const averagePackageCtc = ctcValues.length
    ? `₹${(ctcValues.reduce((a, b) => a + b, 0) / ctcValues.length).toFixed(1)} LPA`
    : '₹0.0 LPA';
  const highestPackageCtc = ctcValues.length
    ? `₹${Math.max(...ctcValues).toFixed(1)} LPA`
    : '₹0.0 LPA';

  res.json({
    telemetry: {
      totalEligibleStudents,
      placedPercentage,
      averagePackageCtc,
      highestPackageCtc,
      registeredRecruiters: distinctCompanies.length,
      activeCampusDrives,
      totalVerifiedCredentials
    }
  });
});

// GET /api/admin/dossier-lookup/:skillSetuId — recruiter/admin credential lookup
const dossierLookup = asyncHandler(async (req, res) => {
  const student = await User.findOne({ skillSetuId: req.params.skillSetuId });
  if (!student) {
    return res.status(404).json({ verified: false, message: 'No candidate found for that Skill-Setu ID.' });
  }

  const skillsVerified = await Skill.countDocuments({ user: student._id, status: 'VALIDATED' });

  res.json({
    verified: student.sovereignStatus === 'VERIFIED_LINKED',
    candidate: {
      name: student.name,
      skillSetuId: student.skillSetuId,
      degree: student.degree,
      institution: student.institution,
      nsqfLevel: student.nsqfLevel,
      sovereignStatus: student.sovereignStatus,
      verifiedSkillsCount: skillsVerified
    }
  });
});

module.exports = { getRoster, approveStudentCredentials, getTelemetry, dossierLookup };
