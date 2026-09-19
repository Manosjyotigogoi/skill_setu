const TrainingProgram = require('../models/TrainingProgram');
const User = require('../models/User');
const PlacementRecord = require('../models/PlacementRecord');
const Notification = require('../models/Notification');
const Document = require('../models/Document');
const Organization = require('../models/Organization');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail } = require('../services/emailService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

function assertGovernmentAdmin(req, res) {
  if (!['admin', 'government_admin'].includes(req.user.role)) {
    res.status(403).json({ message: 'Government administrator access is required.' });
    return false;
  }
  return true;
}

// GET /api/admin/government/overview
const getGovernmentOverview = asyncHandler(async (req, res) => {
  if (!assertGovernmentAdmin(req, res)) return;

  const orgId = req.user.organization;
  const programQuery = orgId ? { organization: orgId } : {};
  const traineeQuery = { role: 'trainee', ...(orgId ? { organization: orgId } : {}) };

  const [traineesCount, programs, placements] = await Promise.all([
    User.countDocuments(traineeQuery),
    TrainingProgram.find(programQuery),
    PlacementRecord.find({ ...(orgId ? { organization: orgId } : {}), trainingProgram: { $exists: true } })
  ]);

  const placedCount = placements.length;
  const retentionPending = placements.filter((p) => p.oneYearStatus === 'pending').length;

  res.json({
    overview: {
      agencyName: req.user.institution || 'Ministry of Skill Development & Training',
      totalTrainees: traineesCount,
      activeProgramsCount: programs.length,
      totalPlacedTrainees: placedCount,
      retentionPendingCount: retentionPending
    }
  });
});

// GET /api/admin/government/programs
const listTrainingPrograms = asyncHandler(async (req, res) => {
  if (!assertGovernmentAdmin(req, res)) return;

  const orgId = req.user.organization;
  const programs = await TrainingProgram.find(orgId ? { organization: orgId } : {}).sort({ createdAt: -1 });

  const programsWithCounts = await Promise.all(
    programs.map(async (p) => {
      const traineeCount = await User.countDocuments({
        role: 'trainee',
        $or: [{ trainingProgram: p._id }, { trainingProgramCode: p.programCode }]
      });

      const placedCount = await PlacementRecord.countDocuments({ trainingProgram: p._id });

      return {
        ...p.toObject(),
        enrolledTraineeCount: traineeCount,
        placedCount
      };
    })
  );

  res.json({ programs: programsWithCounts });
});

// POST /api/admin/government/programs
const createTrainingProgram = asyncHandler(async (req, res) => {
  if (!assertGovernmentAdmin(req, res)) return;

  const {
    title,
    programCode,
    provider,
    description,
    durationWeeks,
    taughtSkills,
    techFocusAreas,
    status
  } = req.body;

  if (!title || !programCode) {
    return res.status(400).json({ message: 'Title and programCode are required.' });
  }

  const cleanCode = String(programCode).trim().toUpperCase();
  const existing = await TrainingProgram.findOne({ programCode: cleanCode });
  if (existing) {
    return res.status(409).json({ message: `A training program with code "${cleanCode}" already exists.` });
  }

  const program = await TrainingProgram.create({
    title: title.trim(),
    programCode: cleanCode,
    organization: req.user.organization,
    provider: provider ? provider.trim() : (req.user.institution || 'Government National Skilling Initiative'),
    description: description ? description.trim() : '',
    durationWeeks: Number(durationWeeks) || 8,
    taughtSkills: Array.isArray(taughtSkills)
      ? taughtSkills.map((s) => (typeof s === 'string' ? { name: s.trim() } : s))
      : [],
    techFocusAreas: Array.isArray(techFocusAreas) ? techFocusAreas : [],
    status: status || 'ACTIVE'
  });

  res.status(201).json({ program });
});

// PATCH /api/admin/government/programs/:id
const updateTrainingProgram = asyncHandler(async (req, res) => {
  if (!assertGovernmentAdmin(req, res)) return;

  if (req.body.programCode) {
    req.body.programCode = String(req.body.programCode).trim().toUpperCase();
  }

  const program = await TrainingProgram.findOneAndUpdate(
    { _id: req.params.id, ...(req.user.organization ? { organization: req.user.organization } : {}) },
    req.body,
    { new: true, runValidators: true }
  );

  if (!program) return res.status(404).json({ message: 'Training program not found.' });
  res.json({ program });
});

// DELETE /api/admin/government/programs/:id
const deleteTrainingProgram = asyncHandler(async (req, res) => {
  if (!assertGovernmentAdmin(req, res)) return;

  const program = await TrainingProgram.findOneAndDelete({
    _id: req.params.id,
    ...(req.user.organization ? { organization: req.user.organization } : {})
  });

  if (!program) return res.status(404).json({ message: 'Training program not found.' });
  res.status(204).send();
});

// GET /api/admin/government/trainees
const listTrainees = asyncHandler(async (req, res) => {
  if (!assertGovernmentAdmin(req, res)) return;

  const { programCode } = req.query;
  const filter = { role: 'trainee' };
  if (req.user.organization) filter.organization = req.user.organization;
  if (programCode) filter.trainingProgramCode = String(programCode).trim().toUpperCase();

  const trainees = await User.find(filter)
    .populate('trainingProgram', 'title programCode provider')
    .sort({ createdAt: -1 });

  const roster = await Promise.all(
    trainees.map(async (t) => {
      const [certificates, placement] = await Promise.all([
        Document.find({ user: t._id, documentType: 'certificate' }),
        PlacementRecord.findOne({ candidate: t._id })
      ]);

      return {
        id: t._id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        trainingProgramCode: t.trainingProgramCode || (t.trainingProgram ? t.trainingProgram.programCode : 'N/A'),
        trainingProgramTitle: t.trainingProgram ? t.trainingProgram.title : 'Unassigned',
        selfReportedSkills: t.selfReportedSkills || [],
        readinessScore: t.readinessScore || 0,
        certificateCount: certificates.length,
        certificates: certificates.map((c) => ({
          id: c._id,
          name: c.originalName,
          url: c.storageUrl,
          date: c.createdAt
        })),
        employmentStatus: placement ? `Placed (${placement.company})` : (t.employmentStatus || 'Open to Work'),
        placementDetails: placement
      };
    })
  );

  res.json({ trainees: roster });
});

// GET /api/admin/government/placements
const listTraineePlacements = asyncHandler(async (req, res) => {
  if (!assertGovernmentAdmin(req, res)) return;

  const orgId = req.user.organization;
  const placements = await PlacementRecord.find({
    ...(orgId ? { organization: orgId } : {}),
    $or: [{ trainingProgram: { $exists: true } }, { organization: orgId }]
  })
    .populate('candidate', 'name email phone trainingProgramCode')
    .populate('trainingProgram', 'title programCode')
    .sort({ placedAt: -1 });

  res.json({ placements });
});

// POST /api/admin/government/placements
const upsertTraineePlacement = asyncHandler(async (req, res) => {
  if (!assertGovernmentAdmin(req, res)) return;

  const { candidateId, programId, company, role, packageLpa, placedAt, notes } = req.body;
  const trainee = await User.findById(candidateId);
  if (!trainee) return res.status(404).json({ message: 'Trainee not found.' });

  const placedDate = placedAt ? new Date(placedAt) : new Date();
  const oneYearTarget = new Date(placedDate);
  oneYearTarget.setFullYear(oneYearTarget.getFullYear() + 1);

  const placement = await PlacementRecord.findOneAndUpdate(
    { candidate: trainee._id },
    {
      candidate: trainee._id,
      organization: req.user.organization,
      trainingProgram: programId || trainee.trainingProgram,
      company: company || 'Employer',
      role: role || 'Trainee Graduate',
      packageLpa: Number(packageLpa) || 0,
      placedAt: placedDate,
      oneYearCheckDate: oneYearTarget,
      oneYearStatus: 'pending',
      currentStatus: 'placed',
      currentCompany: company,
      notes: notes || ''
    },
    { upsert: true, new: true, runValidators: true }
  );

  trainee.employmentStatus = 'Employed';
  trainee.currentCompany = company;
  trainee.currentPackage = `${packageLpa} LPA`;
  await trainee.save();

  res.status(201).json({ placement });
});

// PATCH /api/admin/government/placements/:id/verify-retention
const verifyTraineeRetention = asyncHandler(async (req, res) => {
  if (!assertGovernmentAdmin(req, res)) return;

  const { oneYearStatus, currentCompany, currentPackageLpa, oneYearNotes } = req.body;
  if (!['still_at_company', 'changed_company', 'unemployed'].includes(oneYearStatus)) {
    return res.status(400).json({ message: 'Invalid retention status.' });
  }

  const placement = await PlacementRecord.findById(req.params.id).populate('candidate', 'name email');
  if (!placement) return res.status(404).json({ message: 'Placement record not found.' });

  placement.oneYearStatus = oneYearStatus;
  placement.oneYearVerifiedAt = new Date();
  if (currentCompany) placement.currentCompany = currentCompany;
  if (currentPackageLpa) placement.currentPackageLpa = Number(currentPackageLpa);
  if (oneYearNotes) placement.oneYearNotes = oneYearNotes;

  if (oneYearStatus === 'still_at_company') placement.currentStatus = 'still_employed';
  else if (oneYearStatus === 'changed_company') placement.currentStatus = 'changed_employer';
  else if (oneYearStatus === 'unemployed') placement.currentStatus = 'unemployed';

  await placement.save();

  await User.findByIdAndUpdate(placement.candidate._id, {
    currentCompany: placement.currentCompany,
    currentPackage: placement.currentPackageLpa ? `${placement.currentPackageLpa} LPA` : undefined,
    employmentStatus: oneYearStatus === 'unemployed' ? 'Open to Work' : 'Employed'
  });

  res.json({ placement, message: 'Trainee 1-Year retention status updated.' });
});

// POST /api/admin/government/notifications/dispatch
const dispatchGovernmentNotification = asyncHandler(async (req, res) => {
  if (!assertGovernmentAdmin(req, res)) return;

  const { title, message, link, channels, scheduleType, programCode } = req.body;
  if (!title || !message) {
    return res.status(400).json({ message: 'Title and message are required.' });
  }

  const chosenChannels = Array.isArray(channels) && channels.length > 0 ? channels : ['website', 'email'];
  const interval = ['now', 'weekly', 'monthly', 'quarterly'].includes(scheduleType) ? scheduleType : 'now';

  const filter = { role: 'trainee' };
  if (req.user.organization) filter.organization = req.user.organization;
  if (programCode) filter.trainingProgramCode = String(programCode).trim().toUpperCase();

  const trainees = await User.find(filter);

  const notifications = await Promise.all(
    trainees.map(async (tr) => {
      const notif = await Notification.create({
        recipient: tr._id,
        organization: req.user.organization,
        trainingProgram: tr.trainingProgram,
        title,
        message,
        link: link || '#/job-matching',
        channels: chosenChannels,
        scheduleType: interval,
        deliveryStatus: {
          website: chosenChannels.includes('website') ? 'delivered' : 'skipped',
          email: chosenChannels.includes('email') ? 'pending' : 'skipped',
          whatsapp: chosenChannels.includes('whatsapp') ? 'pending' : 'skipped'
        }
      });

      if (chosenChannels.includes('email') && tr.email) {
        sendEmail({
          to: tr.email,
          name: tr.name,
          subject: title,
          text: message,
          link: link ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}${link}` : undefined
        }).then(() => {
          notif.deliveryStatus.email = 'delivered';
          notif.save();
        }).catch((err) => console.warn('Email dispatch failed:', err.message));
      }

      if (chosenChannels.includes('whatsapp') && tr.phone) {
        sendWhatsAppMessage({
          to: tr.phone,
          message: `${title}\n${message}`,
          link: link ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}${link}` : undefined
        }).then((res) => {
          notif.deliveryStatus.whatsapp = res.success ? 'delivered' : 'failed';
          notif.save();
        }).catch((err) => console.warn('WhatsApp dispatch failed:', err.message));
      }

      return notif;
    })
  );

  res.status(201).json({
    message: `Dispatched ${notifications.length} trainee notifications on schedule '${interval}'.`,
    count: notifications.length
  });
});

module.exports = {
  getGovernmentOverview,
  listTrainingPrograms,
  createTrainingProgram,
  updateTrainingProgram,
  deleteTrainingProgram,
  listTrainees,
  listTraineePlacements,
  upsertTraineePlacement,
  verifyTraineeRetention,
  dispatchGovernmentNotification
};
