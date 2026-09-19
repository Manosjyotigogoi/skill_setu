const User = require('../models/User');
const Otp = require('../models/Otp');
const asyncHandler = require('../utils/asyncHandler');
const { signToken, sendTokenCookie, clearTokenCookie } = require('../utils/token');
const { generateSkillSetuId, hashOtp, generateOtp } = require('../utils/ids');
const { deliverOtp } = require('../utils/otpGateway');
const Organization = require('../models/Organization');
const crypto = require('crypto');

const TrainingProgram = require('../models/TrainingProgram');

function issueSession(res, user) {
  const token = signToken(user._id.toString());
  sendTokenCookie(res, token);
  return token;
}

// POST /api/auth/register
// Creates a student or trainee account with a rich profile.
const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    password,
    accountType,
    // Optional profile fields collected at signup
    rollNo,
    branch,
    degree,
    academicYear,
    institution,
    cgpa,
    experienceYears,
    priorCourses,
    selfReportedSkills,
    preferredJobLocations,
    organizationCode, // for university students
    programCode       // for government trainees
  } = req.body;

  if (!name || (!email && !phone)) {
    return res.status(400).json({ message: 'Name and at least one of email/phone are required.' });
  }

  const role = accountType || 'student';
  if (!['student', 'trainee'].includes(role)) {
    return res.status(400).json({ message: 'accountType must be student or trainee.' });
  }

  const existing = await User.findOne({
    $or: [email ? { email } : null, phone ? { phone } : null].filter(Boolean)
  });
  if (existing) {
    return res.status(409).json({ message: 'An account with that email or phone already exists.' });
  }

  let organization = null;
  let trainingProgram = null;

  // University student verification with university special code
  if (organizationCode) {
    const cleanCode = String(organizationCode).trim().toUpperCase();
    const hash = crypto.createHash('sha256').update(cleanCode).digest('hex');
    organization = await Organization.findOne({
      active: true,
      $or: [{ joinCode: cleanCode }, { joinCodeHash: hash }]
    });
    if (!organization) {
      return res.status(403).json({ message: 'The university code is invalid.' });
    }
  }

  // Government trainee verification with training program code
  if (role === 'trainee' && programCode) {
    const cleanProgramCode = String(programCode).trim().toUpperCase();
    trainingProgram = await TrainingProgram.findOne({ programCode: cleanProgramCode });
    if (!trainingProgram) {
      return res.status(404).json({ message: `No government training program found with code "${cleanProgramCode}".` });
    }
    if (trainingProgram.organization) {
      organization = await Organization.findById(trainingProgram.organization);
    }
  }

  const user = new User({
    name,
    email: email ? email.toLowerCase().trim() : undefined,
    phone: phone ? phone.trim() : undefined,
    role,
    organization: organization?._id,
    trainingProgram: trainingProgram?._id,
    trainingProgramCode: trainingProgram?.programCode,
    skillSetuId: generateSkillSetuId(),
    rollNo: rollNo || '',
    branch: branch || '',
    degree: degree || '',
    academicYear: academicYear || '',
    institution: institution || (organization ? organization.name : ''),
    cgpa: typeof cgpa === 'number' && cgpa >= 0 && cgpa <= 10 ? cgpa : (parseFloat(cgpa) || 0),
    experienceYears: typeof experienceYears === 'number' && experienceYears >= 0 ? experienceYears : (parseInt(experienceYears, 10) || 0),
    priorCourses: Array.isArray(priorCourses) ? priorCourses.filter((s) => typeof s === 'string' && s.trim()).slice(0, 30) : [],
    selfReportedSkills: Array.isArray(selfReportedSkills) ? selfReportedSkills.filter((s) => typeof s === 'string' && s.trim()).slice(0, 30) : [],
    preferredJobLocations: Array.isArray(preferredJobLocations) ? preferredJobLocations.filter((s) => typeof s === 'string' && s.trim()).slice(0, 10) : []
  });

  if (password) {
    await user.setPassword(password);
  }

  await user.save();

  // If trainee registered with a program, link them to the program's enrolled list
  if (trainingProgram) {
    await TrainingProgram.findByIdAndUpdate(trainingProgram._id, {
      $addToSet: { enrolledStudents: user._id }
    });
  }

  issueSession(res, user);

  res.status(201).json({ user: user.toPublicProfile() });
});

// POST /api/auth/register-organization
// Creates the administrator with their custom code (or auto-generated if blank)
const registerOrganization = asyncHandler(async (req, res) => {
  const { name, type, adminName, email, password, customJoinCode } = req.body;
  if (!name || !['university', 'government'].includes(type) || !adminName || !email || !password) {
    return res.status(400).json({ message: 'name, type, adminName, email and password are required.' });
  }
  if (await User.findOne({ email: email.toLowerCase() })) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }

  let code;
  if (customJoinCode && String(customJoinCode).trim()) {
    code = String(customJoinCode).trim().toUpperCase();
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const existing = await Organization.findOne({ $or: [{ joinCode: code }, { joinCodeHash: hash }] });
    if (existing) {
      return res.status(409).json({ message: `The code "${code}" is already in use. Please select a unique code.` });
    }
  } else {
    code = crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  const admin = new User({
    name: adminName,
    email: email.toLowerCase().trim(),
    role: type === 'university' ? 'university_admin' : 'government_admin',
    institution: name
  });
  await admin.setPassword(password);
  await admin.save();

  const organization = await Organization.create({
    name,
    type,
    admin: admin._id,
    contactEmail: email.toLowerCase().trim(),
    joinCode: code,
    joinCodeHash: crypto.createHash('sha256').update(code).digest('hex')
  });

  admin.organization = organization._id;
  await admin.save();

  issueSession(res, admin);
  res.status(201).json({
    user: admin.toPublicProfile(),
    organization: { id: organization._id, name, type, joinCode: code },
    joinCode: code
  });
});

// POST /api/auth/login  { identifier, password }
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ message: 'identifier and password are required.' });
  }

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }]
  }).select('+passwordHash');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Incorrect credentials.' });
  }

  issueSession(res, user);
  res.json({ user: user.toPublicProfile() });
});

// POST /api/auth/otp/request  { identifier }
// Passwordless login path for students/trainees only (admins must use a password).
const requestOtp = asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ message: 'identifier (email or phone) is required.' });
  }

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }]
  });

  if (!user) {
    return res.status(404).json({ message: 'No account found for that email/phone. Please register first.' });
  }

  if (['admin', 'university_admin', 'government_admin'].includes(user.role)) {
    return res.status(403).json({ message: 'Admin accounts must sign in with a password.' });
  }

  const otp = generateOtp();
  const salt = identifier;
  await Otp.create({
    identifier,
    otpHash: hashOtp(otp, salt),
    expiresAt: new Date(Date.now() + (Number(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000)
  });

  await deliverOtp(identifier, otp);

  const payload = { message: 'OTP sent.' };
  if (process.env.OTP_DEBUG_ECHO === 'true' && process.env.NODE_ENV !== 'production') {
    payload.devOtp = otp; // dev-only convenience since no SMS/email gateway is wired up
  }

  res.json(payload);
});

// POST /api/auth/otp/verify  { identifier, otp }
const verifyOtp = asyncHandler(async (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) {
    return res.status(400).json({ message: 'identifier and otp are required.' });
  }

  const record = await Otp.findOne({ identifier }).sort({ createdAt: -1 });
  if (!record) {
    return res.status(400).json({ message: 'No OTP request found. Please request a new one.' });
  }

  if (record.expiresAt < new Date()) {
    await record.deleteOne();
    return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
  }

  if (record.attempts >= 5) {
    return res.status(429).json({ message: 'Too many attempts. Please request a new OTP.' });
  }

  const expectedHash = hashOtp(otp, identifier);
  if (expectedHash !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    return res.status(401).json({ message: 'Incorrect OTP.' });
  }

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }]
  });
  if (!user) {
    return res.status(404).json({ message: 'Account no longer exists.' });
  }

  await record.deleteOne();
  issueSession(res, user);
  res.json({ user: user.toPublicProfile() });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);
  res.json({ message: 'Logged out.' });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPublicProfile() });
});

module.exports = { register, registerOrganization, login, requestOtp, verifyOtp, logout, me };
