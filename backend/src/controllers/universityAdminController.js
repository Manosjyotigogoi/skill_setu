const Drive = require('../models/Drive');
const Application = require('../models/Application');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PlacementRecord = require('../models/PlacementRecord');
const Organization = require('../models/Organization');
const Skill = require('../models/Skill');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail } = require('../services/emailService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

function assertUniversityAdmin(req, res) {
  if (!['admin', 'university_admin'].includes(req.user.role)) {
    res.status(403).json({ message: 'University administrator access is required.' });
    return false;
  }
  return true;
}

// GET /api/admin/university/overview
const getUniversityOverview = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const orgId = req.user.organization;
  const org = orgId ? await Organization.findById(orgId) : null;

  const studentQuery = { role: 'student', ...(orgId ? { organization: orgId } : {}) };
  const driveQuery = orgId ? { organization: orgId } : {};

  const [studentsCount, drivesCount, applicationsCount, placements] = await Promise.all([
    User.countDocuments(studentQuery),
    Drive.countDocuments(driveQuery),
    Application.countDocuments(driveQuery),
    PlacementRecord.find(orgId ? { organization: orgId } : {})
  ]);

  const placedCount = placements.length;
  const oneYearPending = placements.filter((p) => p.oneYearStatus === 'pending').length;

  const totalPackage = placements.reduce((acc, p) => acc + (p.packageLpa || 0), 0);
  const avgPackage = placedCount > 0 ? (totalPackage / placedCount).toFixed(1) : '0.0';
  const highestPackage = placements.length > 0 ? Math.max(...placements.map((p) => p.packageLpa || 0)).toFixed(1) : '0.0';

  res.json({
    overview: {
      universityName: org ? org.name : req.user.institution || 'University Placement Cell',
      universityCode: org ? org.joinCode : 'N/A',
      totalStudents: studentsCount,
      activeDrives: drivesCount,
      totalApplications: applicationsCount,
      totalPlaced: placedCount,
      averagePackage: `${avgPackage} LPA`,
      highestPackage: `${highestPackage} LPA`,
      oneYearFollowUpPending: oneYearPending
    }
  });
});

// GET /api/admin/university/students
const listStudents = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const orgId = req.user.organization;
  const students = await User.find({
    role: 'student',
    ...(orgId ? { organization: orgId } : {})
  }).sort({ createdAt: -1 });

  const studentRoster = await Promise.all(
    students.map(async (st) => {
      const [skillsCount, applications, placement] = await Promise.all([
        Skill.countDocuments({ user: st._id, status: 'VALIDATED' }),
        Application.find({ user: st._id }).populate('drive', 'company role'),
        PlacementRecord.findOne({ candidate: st._id })
      ]);

      return {
        id: st._id,
        name: st.name,
        email: st.email,
        phone: st.phone,
        rollNo: st.rollNo,
        branch: st.branch,
        degree: st.degree,
        academicYear: st.academicYear,
        cgpa: st.cgpa,
        skillsCount: skillsCount || (st.selfReportedSkills ? st.selfReportedSkills.length : 0),
        selfReportedSkills: st.selfReportedSkills || [],
        readinessScore: st.readinessScore || 0,
        applicationsCount: applications.length,
        placementStatus: placement
          ? `Placed (${placement.company} - ₹${placement.packageLpa} LPA)`
          : st.employmentStatus || 'Open to Work',
        placementDetails: placement
      };
    })
  );

  res.json({ students: studentRoster });
});

// GET /api/admin/university/drives
const listCampusDrives = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const orgId = req.user.organization;
  const drives = await Drive.find(orgId ? { organization: orgId } : {}).sort({ createdAt: -1 });

  const drivesWithApps = await Promise.all(
    drives.map(async (d) => {
      const appCount = await Application.countDocuments({ drive: d._id });
      return {
        ...d.toObject(),
        applicationsCount: appCount
      };
    })
  );

  res.json({ drives: drivesWithApps });
});

// POST /api/admin/university/drives
const createCampusDrive = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const {
    company,
    role,
    location,
    ctc,
    ctcMinLpa,
    ctcMaxLpa,
    eligibilityCgpa,
    deadline,
    driveDate,
    rounds,
    requiredSkills,
    status
  } = req.body;

  if (!company || !role) {
    return res.status(400).json({ message: 'Company name and job role are required.' });
  }

  const drive = await Drive.create({
    organization: req.user.organization,
    company,
    role,
    type: 'Campus Placement Drive',
    location: location || 'Campus / Multiple Locations',
    ctc: ctc || (ctcMinLpa && ctcMaxLpa ? `₹${ctcMinLpa} - ${ctcMaxLpa} LPA` : 'As per industry standard'),
    ctcMinLpa: Number(ctcMinLpa) || 0,
    ctcMaxLpa: Number(ctcMaxLpa) || Number(ctcMinLpa) || 0,
    eligibilityCgpa: Number(eligibilityCgpa) || 0,
    deadline: deadline ? new Date(deadline) : undefined,
    driveDate: driveDate ? new Date(driveDate) : undefined,
    rounds: rounds || 'Online Test + Technical + HR Interview',
    requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
    status: status || 'OPEN'
  });

  res.status(201).json({ drive });
});

// PATCH /api/admin/university/drives/:id
const updateCampusDrive = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const drive = await Drive.findOneAndUpdate(
    { _id: req.params.id, ...(req.user.organization ? { organization: req.user.organization } : {}) },
    req.body,
    { new: true, runValidators: true }
  );

  if (!drive) return res.status(404).json({ message: 'Campus placement drive not found.' });
  res.json({ drive });
});

// DELETE /api/admin/university/drives/:id
const deleteCampusDrive = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const drive = await Drive.findOneAndDelete({
    _id: req.params.id,
    ...(req.user.organization ? { organization: req.user.organization } : {})
  });

  if (!drive) return res.status(404).json({ message: 'Campus placement drive not found.' });
  await Application.deleteMany({ drive: drive._id });

  res.status(204).send();
});

// GET /api/admin/university/drives/:id/applications
const getDriveApplications = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const drive = await Drive.findById(req.params.id);
  if (!drive) return res.status(404).json({ message: 'Drive not found.' });

  const applications = await Application.find({ drive: drive._id })
    .populate('user', 'name email phone rollNo branch cgpa readinessScore selfReportedSkills')
    .sort({ createdAt: -1 });

  res.json({ drive, applications });
});

// PATCH /api/admin/university/applications/:id
const updateStudentApplication = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const { status, interviewDate, notes } = req.body;
  if (!['Applied', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid application status.' });
  }

  const application = await Application.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('drive', 'company role location');

  if (!application) return res.status(404).json({ message: 'Application not found.' });

  application.status = status;
  if (interviewDate) application.interviewDate = new Date(interviewDate);
  if (notes) application.notes = notes;
  await application.save();

  // Create In-App Notification with clickable link
  let notificationTitle = 'Campus Drive Application Update';
  let notificationMessage = `Your application for ${application.drive.company} (${application.drive.role}) is now ${status}.`;

  if (status === 'Interview Scheduled' || interviewDate) {
    notificationTitle = `Interview Scheduled: ${application.drive.company}`;
    const dateString = new Date(interviewDate || application.interviewDate).toLocaleString();
    notificationMessage = `Congratulations! Your interview for ${application.drive.company} is scheduled on ${dateString}.`;
  } else if (status === 'Selected') {
    notificationTitle = `Offer Selected: ${application.drive.company}!`;
    notificationMessage = `Congratulations! You have been selected for ${application.drive.company} as ${application.drive.role}.`;
  }

  const notification = await Notification.create({
    recipient: application.user._id,
    organization: req.user.organization,
    title: notificationTitle,
    message: notificationMessage,
    link: '#/job-matching',
    channels: ['website', 'email', 'whatsapp'],
    deliveryStatus: { website: 'delivered', email: 'pending', whatsapp: 'pending' }
  });

  // Multi-Channel Dispatch (Email via EmailJS / WhatsApp via Cloud API)
  if (application.user.email) {
    sendEmail({
      to: application.user.email,
      name: application.user.name,
      subject: notificationTitle,
      text: notificationMessage,
      link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}#/job-matching`
    }).then(() => {
      notification.deliveryStatus.email = 'delivered';
      notification.save();
    }).catch((err) => console.warn('Email dispatch failed:', err.message));
  }

  if (application.user.phone) {
    sendWhatsAppMessage({
      to: application.user.phone,
      message: `${notificationTitle}\n${notificationMessage}`,
      link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}#/job-matching`
    }).then((res) => {
      notification.deliveryStatus.whatsapp = res.success ? 'delivered' : 'failed';
      notification.save();
    }).catch((err) => console.warn('WhatsApp dispatch failed:', err.message));
  }

  res.json({ application, notification });
});

// GET /api/admin/university/placements
const listPlacements = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const orgId = req.user.organization;
  const placements = await PlacementRecord.find(orgId ? { organization: orgId } : {})
    .populate('candidate', 'name email phone rollNo branch degree')
    .sort({ placedAt: -1 });

  res.json({ placements });
});

// POST /api/admin/university/placements
const upsertPlacement = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const { candidateId, driveId, company, role, packageLpa, placedAt, notes } = req.body;
  const candidate = await User.findById(candidateId);
  if (!candidate) return res.status(404).json({ message: 'Candidate student not found.' });

  const placedDate = placedAt ? new Date(placedAt) : new Date();
  const oneYearTarget = new Date(placedDate);
  oneYearTarget.setFullYear(oneYearTarget.getFullYear() + 1);

  const placement = await PlacementRecord.findOneAndUpdate(
    { candidate: candidate._id },
    {
      candidate: candidate._id,
      organization: req.user.organization,
      drive: driveId || undefined,
      company: company || 'Company',
      role: role || '',
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

  candidate.employmentStatus = 'Employed';
  candidate.currentCompany = company;
  candidate.currentPackage = `${packageLpa} LPA`;
  await candidate.save();

  res.status(201).json({ placement });
});

// PATCH /api/admin/university/placements/:id/verify-retention
// 1-Year Check: Checks if they are still placed there or are they somewhere else
const verifyOneYearRetention = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const { oneYearStatus, currentCompany, currentPackageLpa, oneYearNotes } = req.body;
  if (!['still_at_company', 'changed_company', 'unemployed'].includes(oneYearStatus)) {
    return res.status(400).json({ message: 'Invalid 1-year retention status.' });
  }

  const placement = await PlacementRecord.findById(req.params.id).populate('candidate', 'name email');
  if (!placement) return res.status(404).json({ message: 'Placement record not found.' });

  placement.oneYearStatus = oneYearStatus;
  placement.oneYearVerifiedAt = new Date();
  if (currentCompany) placement.currentCompany = currentCompany;
  if (currentPackageLpa) placement.currentPackageLpa = Number(currentPackageLpa);
  if (oneYearNotes) placement.oneYearNotes = oneYearNotes;

  if (oneYearStatus === 'still_at_company') {
    placement.currentStatus = 'still_employed';
  } else if (oneYearStatus === 'changed_company') {
    placement.currentStatus = 'changed_employer';
  } else if (oneYearStatus === 'unemployed') {
    placement.currentStatus = 'unemployed';
  }

  await placement.save();

  // Also update candidate's current employment profile
  await User.findByIdAndUpdate(placement.candidate._id, {
    currentCompany: placement.currentCompany,
    currentPackage: placement.currentPackageLpa ? `${placement.currentPackageLpa} LPA` : undefined,
    employmentStatus: oneYearStatus === 'unemployed' ? 'Open to Work' : 'Employed'
  });

  res.json({ placement, message: '1-Year placement retention status successfully updated.' });
});

// POST /api/admin/university/notifications/dispatch
// Sends notifications to students manually or with scheduled intervals (now, weekly, monthly, quarterly)
const dispatchUniversityNotification = asyncHandler(async (req, res) => {
  if (!assertUniversityAdmin(req, res)) return;

  const { title, message, link, channels, scheduleType, studentIds } = req.body;
  if (!title || !message) {
    return res.status(400).json({ message: 'Title and message are required.' });
  }

  const chosenChannels = Array.isArray(channels) && channels.length > 0 ? channels : ['website', 'email'];
  const interval = ['now', 'weekly', 'monthly', 'quarterly'].includes(scheduleType) ? scheduleType : 'now';

  const orgId = req.user.organization;
  let targetStudents = [];

  if (Array.isArray(studentIds) && studentIds.length > 0) {
    targetStudents = await User.find({ _id: { $in: studentIds }, role: 'student' });
  } else {
    targetStudents = await User.find({ role: 'student', ...(orgId ? { organization: orgId } : {}) });
  }

  const notifications = await Promise.all(
    targetStudents.map(async (st) => {
      const notif = await Notification.create({
        recipient: st._id,
        organization: orgId,
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

      if (chosenChannels.includes('email') && st.email) {
        sendEmail({
          to: st.email,
          name: st.name,
          subject: title,
          text: message,
          link: link ? `${process.env.FRONTEND_URL || 'http://localhost:5173'}${link}` : undefined
        }).then(() => {
          notif.deliveryStatus.email = 'delivered';
          notif.save();
        }).catch((err) => console.warn('Email dispatch failed:', err.message));
      }

      if (chosenChannels.includes('whatsapp') && st.phone) {
        sendWhatsAppMessage({
          to: st.phone,
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
    message: `Dispatched ${notifications.length} notifications on schedule '${interval}'.`,
    count: notifications.length
  });
});

module.exports = {
  getUniversityOverview,
  listStudents,
  listCampusDrives,
  createCampusDrive,
  updateCampusDrive,
  deleteCampusDrive,
  getDriveApplications,
  updateStudentApplication,
  listPlacements,
  upsertPlacement,
  verifyOneYearRetention,
  dispatchUniversityNotification
};
