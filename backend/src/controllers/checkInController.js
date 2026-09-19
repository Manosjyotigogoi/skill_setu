const EmploymentCheckIn = require('../models/EmploymentCheckIn');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { runQuarterlyCheckInCycle, getCurrentCycle } = require('../services/checkInScheduler');

// GET /api/check-ins/admin/all
// Admin-only: list all check-ins, optionally filtered by cycle or status
const listAllCheckIns = asyncHandler(async (req, res) => {
  const { cycle, status } = req.query;
  const filter = {};
  if (cycle) filter.cycle = cycle;
  if (status) filter.currentEmploymentStatus = status;

  const checkIns = await EmploymentCheckIn.find(filter)
    .populate('user', 'name email phone skillSetuId degree institution')
    .sort({ cycle: -1, emailSentAt: -1 });

  res.json({ checkIns });
});

// GET /api/check-ins/admin/summary
// Admin-only: aggregate summary for the dashboard
const getSummary = asyncHandler(async (req, res) => {
  const currentCycle = getCurrentCycle();

  const [
    totalCandidates,
    checkInsThisCycle,
    respondedThisCycle,
    employedCount,
    openToWorkCount,
    wantsReferralCount
  ] = await Promise.all([
    User.countDocuments({ role: { $in: ['student', 'trainee'] } }),
    EmploymentCheckIn.countDocuments({ cycle: currentCycle }),
    EmploymentCheckIn.countDocuments({ cycle: currentCycle, respondedAt: { $ne: null } }),
    EmploymentCheckIn.countDocuments({ cycle: currentCycle, currentEmploymentStatus: 'EMPLOYED' }),
    EmploymentCheckIn.countDocuments({ cycle: currentCycle, currentEmploymentStatus: 'OPEN_TO_WORK' }),
    EmploymentCheckIn.countDocuments({ cycle: currentCycle, wantsReferral: true })
  ]);

  const responseRate = totalCandidates > 0
    ? Number(((respondedThisCycle / totalCandidates) * 100).toFixed(1))
    : 0;

  res.json({
    summary: {
      currentCycle,
      totalCandidates,
      checkInsSent: checkInsThisCycle,
      responded: respondedThisCycle,
      responseRate,
      employed: employedCount,
      openToWork: openToWorkCount,
      wantsReferral: wantsReferralCount
    }
  });
});

// POST /api/check-ins/admin/run-cycle
// Admin-only: manually trigger the quarterly check-in email cycle
const triggerCycle = asyncHandler(async (req, res) => {
  const result = await runQuarterlyCheckInCycle();
  res.json(result);
});

// PATCH /api/check-ins/admin/:id
// Admin-only: update admin action on a check-in
const updateAdminAction = asyncHandler(async (req, res) => {
  const { adminActionTaken, adminNotes } = req.body;
  const checkIn = await EmploymentCheckIn.findById(req.params.id);
  if (!checkIn) return res.status(404).json({ message: 'Check-in not found.' });

  if (adminActionTaken) checkIn.adminActionTaken = adminActionTaken;
  if (adminNotes !== undefined) checkIn.adminNotes = adminNotes;

  await checkIn.save();
  res.json({ checkIn });
});

// GET /api/check-ins/me
// Student/trainee: get their check-in for the current cycle (if any)
const getMyCheckIns = asyncHandler(async (req, res) => {
  const currentCycle = getCurrentCycle();
  const checkIns = await EmploymentCheckIn.find({ user: req.user._id }).sort({ cycle: -1 });
  res.json({ checkIns, currentCycle });
});

// GET /api/check-ins/:id
// Public-ish: get a check-in by ID (used by the student's email link).
// We don't require auth here so the student can respond from their email
// link without logging in first — but we do require the check-in ID to be valid.
const getCheckInById = asyncHandler(async (req, res) => {
  const checkIn = await EmploymentCheckIn.findById(req.params.id).populate('user', 'name');
  if (!checkIn) return res.status(404).json({ message: 'Check-in not found.' });
  res.json({ checkIn });
});

// PATCH /api/check-ins/:id/respond
// Student/trainee: submit their employment status response
const respondToCheckIn = asyncHandler(async (req, res) => {
  const {
    currentEmploymentStatus,
    currentCompany,
    currentRole,
    currentPackage,
    wantsReferral,
    notes
  } = req.body;

  const checkIn = await EmploymentCheckIn.findById(req.params.id);
  if (!checkIn) return res.status(404).json({ message: 'Check-in not found.' });

  if (checkIn.respondedAt) {
    return res.status(409).json({ message: 'You have already responded to this check-in.' });
  }

  checkIn.currentEmploymentStatus = currentEmploymentStatus;
  checkIn.currentCompany = currentCompany || '';
  checkIn.currentRole = currentRole || '';
  checkIn.currentPackage = currentPackage || '';
  checkIn.wantsReferral = Boolean(wantsReferral);
  checkIn.notes = notes || '';
  checkIn.respondedAt = new Date();

  await checkIn.save();

  // If the student is employed, also sync their User profile
  if (currentEmploymentStatus === 'EMPLOYED') {
    await User.findByIdAndUpdate(checkIn.user, {
      employmentStatus: 'Employed',
      currentCompany: currentCompany || '',
      currentRole: currentRole || '',
      currentPackage: currentPackage || ''
    });
  } else if (currentEmploymentStatus === 'OPEN_TO_WORK') {
    await User.findByIdAndUpdate(checkIn.user, {
      employmentStatus: 'Open to Work'
    });
  } else if (currentEmploymentStatus === 'NOT_LOOKING') {
    await User.findByIdAndUpdate(checkIn.user, {
      employmentStatus: 'Not Looking'
    });
  }

  res.json({ checkIn, message: 'Thank you for your response!' });
});

module.exports = {
  listAllCheckIns,
  getSummary,
  triggerCycle,
  updateAdminAction,
  getMyCheckIns,
  getCheckInById,
  respondToCheckIn
};
