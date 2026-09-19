const Drive = require('../models/Drive');
const Application = require('../models/Application');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PlacementRecord = require('../models/PlacementRecord');
const Organization = require('../models/Organization');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail } = require('../services/emailService');

const adminRoles = ['admin', 'university_admin', 'government_admin'];

function assertAdmin(req, res) {
  if (!adminRoles.includes(req.user.role)) {
    res.status(403).json({ message: 'Administrator access is required.' });
    return false;
  }
  return true;
}

async function scopedCandidates(req) {
  const filter = { role: req.user.role === 'government_admin' ? 'trainee' : 'student' };
  if (req.user.organization) filter.organization = req.user.organization;
  return User.find(filter).sort({ createdAt: -1 });
}

const getOverview = asyncHandler(async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const candidates = await scopedCandidates(req);
  const candidateIds = candidates.map((item) => item._id);
  const [drives, applications, placements] = await Promise.all([
    Drive.countDocuments(req.user.organization ? { organization: req.user.organization } : {}),
    Application.countDocuments({ user: { $in: candidateIds } }),
    PlacementRecord.find({ candidate: { $in: candidateIds } }).sort({ placedAt: -1 }).populate('candidate', 'name email')
  ]);
  res.json({ overview: { candidates: candidates.length, drives, applications, placements: placements.length }, placements });
});

const listCandidates = asyncHandler(async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const candidates = await scopedCandidates(req);
  res.json({ candidates });
});

const createDrive = asyncHandler(async (req, res) => {
  if (!assertAdmin(req, res)) return;
  if (req.user.role === 'government_admin') {
    return res.status(403).json({ message: 'Government administrators manage training opportunities from their programme feed.' });
  }
  const drive = await Drive.create({ ...req.body, organization: req.user.organization });
  res.status(201).json({ drive });
});

const updateDrive = asyncHandler(async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const drive = await Drive.findOneAndUpdate(
    { _id: req.params.id, ...(req.user.organization ? { organization: req.user.organization } : {}) },
    req.body,
    { new: true, runValidators: true }
  );
  if (!drive) return res.status(404).json({ message: 'Placement drive not found.' });
  res.json({ drive });
});

const deleteDrive = asyncHandler(async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const drive = await Drive.findOneAndDelete({ _id: req.params.id, ...(req.user.organization ? { organization: req.user.organization } : {}) });
  if (!drive) return res.status(404).json({ message: 'Placement drive not found.' });
  await Application.deleteMany({ drive: drive._id });
  res.status(204).send();
});

const updateApplication = asyncHandler(async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const { status, interviewDate } = req.body;
  if (!['Shortlisted', 'Rejected', 'Selected'].includes(status)) {
    return res.status(400).json({ message: 'status must be Shortlisted, Rejected or Selected.' });
  }
  const application = await Application.findById(req.params.id).populate('user', 'name email phone organization').populate('drive', 'company role');
  if (!application) return res.status(404).json({ message: 'Application not found.' });
  if (req.user.organization && application.user.organization?.toString() !== req.user.organization.toString()) {
    return res.status(403).json({ message: 'This application is outside your organisation.' });
  }
  application.status = status;
  application.interviewDate = interviewDate || application.interviewDate;
  await application.save();
  const message = interviewDate
    ? `Your interview for ${application.drive.company} is scheduled for ${new Date(interviewDate).toLocaleString()}.`
    : `Your application for ${application.drive.company} is now ${status}.`;
  const notification = await Notification.create({
    recipient: application.user._id,
    organization: req.user.organization,
    title: interviewDate ? 'Interview scheduled' : 'Placement application updated',
    message,
    link: '/job-matching',
    channels: ['website', 'email']
  });
  if (application.user.email) {
    await sendEmail({ to: application.user.email, subject: notification.title, text: message, html: `<p>${message}</p>` });
  }
  res.json({ application, notification });
});

const upsertPlacement = asyncHandler(async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const candidate = await User.findOne({ _id: req.body.candidate, organization: req.user.organization });
  if (!candidate) return res.status(404).json({ message: 'Candidate not found in your organisation.' });
  const placement = await PlacementRecord.findOneAndUpdate(
    { candidate: candidate._id, organization: req.user.organization },
    { ...req.body, candidate: candidate._id, organization: req.user.organization, lastVerifiedAt: new Date() },
    { upsert: true, new: true, runValidators: true }
  );
  candidate.employmentStatus = placement.currentStatus === 'unemployed' ? 'Open to Work' : 'Employed';
  candidate.currentCompany = placement.currentCompany || placement.company;
  candidate.currentPackage = String(placement.currentPackageLpa || placement.packageLpa);
  await candidate.save();
  res.json({ placement });
});

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ notifications });
});

module.exports = { getOverview, listCandidates, createDrive, updateDrive, deleteDrive, updateApplication, upsertPlacement, getNotifications };
