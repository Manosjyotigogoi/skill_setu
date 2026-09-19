const TrainingProgram = require('../models/TrainingProgram');
const User = require('../models/User');
const Drive = require('../models/Drive');
const Skill = require('../models/Skill');
const Application = require('../models/Application');
const asyncHandler = require('../utils/asyncHandler');
const { analyzeTrainingProgram } = require('../services/aiService');

// GET /api/training-programs
// Admin-only: list all training programs
const listPrograms = asyncHandler(async (req, res) => {
  const programs = await TrainingProgram.find().sort({ createdAt: -1 });
  res.json({ programs });
});

// GET /api/training-programs/:id
// Admin-only: get a single program with its impact metrics
const getProgram = asyncHandler(async (req, res) => {
  const program = await TrainingProgram.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Training program not found.' });

  // Compute the three impact parameters in parallel:
  // 1. Number of trainees placed (via Application model)
  // 2. Number of companies demanding the taught skills (via Drive model)
  // 3. Tech alignment (cached on the program; refresh via AI endpoint)
  const taughtSkillNames = program.taughtSkills.map((s) => s.name);

  const [enrolledCount, placedTrainees, activeDrivesForSkills] = await Promise.all([
    TrainingProgram.findById(program._id).then((p) => p.enrolledStudents.length),
    // Find all users who enrolled in this program AND have at least one
    // "Selected" application → they got placed
    Application.find({
      user: { $in: program.enrolledStudents },
      status: 'Selected'
    }).distinct('user'),
    // Find all OPEN drives whose requiredSkills overlap with the taught skills
    Drive.find({ status: 'OPEN' }).distinct('company', {
      requiredSkills: { $in: taughtSkillNames }
    })
  ]);

  const placementCount = placedTrainees.length;
  const companyDemandCount = activeDrivesForSkills.length;

  res.json({
    program: {
      ...program.toObject(),
      impactMetrics: {
        enrolledCount,
        placementCount,
        companyDemandCount,
        techAlignmentScore: program.aiAnalysis?.techAlignmentScore ?? null,
        lastAnalyzedAt: program.aiAnalysis?.analyzedAt ?? null,
        aiSummary: program.aiAnalysis?.summary ?? '',
        recommendations: program.aiAnalysis?.recommendations ?? []
      }
    }
  });
});

// POST /api/training-programs
// Admin-only: create a new training program
const createProgram = asyncHandler(async (req, res) => {
  const { title, provider, description, durationWeeks, taughtSkills, techFocusAreas } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required.' });
  }

  const program = await TrainingProgram.create({
    title,
    provider,
    description,
    durationWeeks,
    taughtSkills: taughtSkills || [],
    techFocusAreas: techFocusAreas || []
  });

  res.status(201).json({ program });
});

// POST /api/training-programs/:id/enroll
// Student/trainee: enroll yourself in this program
const enrollInProgram = asyncHandler(async (req, res) => {
  const program = await TrainingProgram.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Training program not found.' });

  if (program.enrolledStudents.includes(req.user._id)) {
    return res.json({ message: 'Already enrolled.', enrolled: true });
  }

  program.enrolledStudents.push(req.user._id);
  await program.save();

  res.json({ message: 'Enrolled successfully.', enrolled: true });
});

// POST /api/training-programs/:id/ai-analysis
// Admin-only: run the AI analysis and cache it on the program
const runAiAnalysis = asyncHandler(async (req, res) => {
  const program = await TrainingProgram.findById(req.params.id);
  if (!program) return res.status(404).json({ message: 'Training program not found.' });

  // Compute hard metrics first
  const taughtSkillNames = program.taughtSkills.map((s) => s.name);

  const [placedTrainees, activeDrivesForSkills] = await Promise.all([
    Application.find({
      user: { $in: program.enrolledStudents },
      status: 'Selected'
    }).distinct('user'),
    Drive.find({ status: 'OPEN' }).distinct('company', {
      requiredSkills: { $in: taughtSkillNames }
    })
  ]);

  const placementCount = placedTrainees.length;
  const companyDemandCount = activeDrivesForSkills.length;

  // Call the AI service
  const analysis = await analyzeTrainingProgram(program, placementCount, companyDemandCount);

  // Cache the analysis on the program
  program.aiAnalysis = {
    techAlignmentScore: analysis.techAlignmentScore ?? 0,
    summary: analysis.summary || '',
    recommendations: analysis.recommendations || [],
    analyzedAt: new Date()
  };
  await program.save();

  res.json({
    program,
    impactMetrics: {
      placementCount,
      companyDemandCount,
      techAlignmentScore: analysis.techAlignmentScore ?? 0,
      overallImpact: analysis.overallImpact || 'UNKNOWN',
      summary: analysis.summary || '',
      recommendations: analysis.recommendations || [],
      techAlignmentReasoning: analysis.techAlignmentReasoning || ''
    }
  });
});

module.exports = {
  listPrograms,
  getProgram,
  createProgram,
  enrollInProgram,
  runAiAnalysis
};
