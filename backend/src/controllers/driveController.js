const Drive = require('../models/Drive');
const Application = require('../models/Application');
const Skill = require('../models/Skill');
const asyncHandler = require('../utils/asyncHandler');
const { annotateDriveMatch } = require('../utils/matching');

function formatCtc(min, max) {
  if (!min && !max) return '';
  return `₹${min.toFixed(1)} - ${max.toFixed(1)} LPA`;
}

async function buildDriveView(drive, userSkills, myApplication) {
  const { matchedSkills, missingSkills, matchPercentage } = annotateDriveMatch(
    userSkills,
    drive.requiredSkills
  );

  return {
    id: drive._id,
    company: drive.company,
    logoInitials: drive.logoInitials,
    role: drive.role,
    type: drive.type,
    location: drive.location,
    ctc: drive.ctc || formatCtc(drive.ctcMinLpa, drive.ctcMaxLpa),
    eligibilityCgpa: drive.eligibilityCgpa,
    matchPercentage,
    deadline: drive.deadline,
    driveDate: drive.driveDate,
    rounds: drive.rounds,
    matchedSkills,
    missingSkills,
    status: drive.status,
    applied: Boolean(myApplication),
    appliedDate: myApplication ? myApplication.appliedAt : undefined,
    applicationStatus: myApplication ? myApplication.applicationStatus : undefined,
    appStatus: myApplication ? myApplication.status : undefined,
    interviewDate: myApplication ? myApplication.interviewDate : undefined
  };
}


// GET /api/drives
const getDrives = asyncHandler(async (req, res) => {
  const [drives, mySkills, myApplications] = await Promise.all([
    Drive.find({ status: 'OPEN' }).sort({ deadline: 1 }),
    Skill.find({ user: req.user._id, status: 'VALIDATED' }).select('name score'),
    Application.find({ user: req.user._id })
  ]);

  const appByDrive = new Map(myApplications.map((a) => [a.drive.toString(), a]));

  const views = await Promise.all(
    drives.map((drive) => buildDriveView(drive, mySkills, appByDrive.get(drive._id.toString())))
  );

  res.json({ drives: views });
});

// GET /api/drives/:id
const getDriveById = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive) return res.status(404).json({ message: 'Drive not found.' });

  const [mySkills, myApplication] = await Promise.all([
    Skill.find({ user: req.user._id, status: 'VALIDATED' }).select('name score'),
    Application.findOne({ user: req.user._id, drive: drive._id })
  ]);

  res.json({ drive: await buildDriveView(drive, mySkills, myApplication) });
});

// POST /api/drives/:id/apply
const applyToDrive = asyncHandler(async (req, res) => {
  const drive = await Drive.findById(req.params.id);
  if (!drive) return res.status(404).json({ message: 'Drive not found.' });

  if (drive.status !== 'OPEN') {
    return res.status(400).json({ message: 'This drive is no longer accepting applications.' });
  }

  if (drive.eligibilityCgpa && req.user.cgpa < drive.eligibilityCgpa) {
    return res.status(403).json({
      message: `This drive requires a minimum CGPA of ${drive.eligibilityCgpa}.`
    });
  }

  const existing = await Application.findOne({ user: req.user._id, drive: drive._id });
  if (existing) {
    return res.status(409).json({ message: 'You have already applied to this drive.' });
  }

  const application = await Application.create({
    user: req.user._id,
    drive: drive._id,
    status: 'Applied',
    applicationStatus: 'Applied with Skill-Setu Sovereign Passport'
  });

  res.status(201).json({ application });
});

module.exports = { getDrives, getDriveById, applyToDrive };
