const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Skill = require('../models/Skill');
const asyncHandler = require('../utils/asyncHandler');
const {
  discoverJobsForSkills,
  discoverCoursesForGaps,
  analyzeTechTrends,
  analyzeSkillGap
} = require('../services/aiService');


// POST /api/ai/discover-jobs
// Student/trainee: discover live job postings matching their verified skills.
// Uses BOTH server-verified skills AND self-reported skills from the signup
// form — so even a brand-new user with no verified skills yet gets relevant
// job recommendations based on what they told us at signup.
const discoverJobs = asyncHandler(async (req, res) => {
  // Fetch the user's verified skills (top 5)
  const verifiedSkills = await Skill.find({ user: req.user._id, status: 'VALIDATED' })
    .select('name score')
    .sort({ score: -1 })
    .limit(5);

  // Merge with self-reported skills from the user's profile
  const selfReported = req.user.selfReportedSkills || [];

  // Deduplicate: prefer verified skills, fall back to self-reported if none
  const skills = verifiedSkills.length > 0
    ? verifiedSkills.map((s) => ({ name: s.name, score: s.score }))
    : selfReported.map((name) => ({ name, score: 0 }));

  // If still no skills, surface a helpful message
  if (skills.length === 0) {
    return res.json({
      jobs: [],
      message: 'No skills on your profile yet. Add your skills in Profile & Documents, or upload a transcript to get them verified.'
    });
  }

  // Use the user's preferred location if set, otherwise the request body
  const location = req.body?.location
    || (req.user.preferredJobLocations && req.user.preferredJobLocations[0])
    || 'India';

  const rawResult = await discoverJobsForSkills(skills, location);

  // The service always returns normalized jobs, while retaining this shape
  // handling for compatibility with older AI service implementations.
  const jobs = Array.isArray(rawResult) ? rawResult : (rawResult.jobs || []);
  const insight = !Array.isArray(rawResult) ? (rawResult.insight || '') : '';
  const providerError = !Array.isArray(rawResult) ? (rawResult.providerError || '') : '';

  res.json({
    jobs,
    insight,
    providerError,
    searchedSkills: skills.map((s) => s.name),
    location,
    count: jobs.length
  });
});

// POST /api/ai/discover-courses
// Student/trainee: discover online courses to bridge their skill gaps
const discoverCourses = asyncHandler(async (req, res) => {
  const { gapSkills } = req.body;

  if (!Array.isArray(gapSkills) || gapSkills.length === 0) {
    return res.json({
      courses: [],
      message: 'Please provide a list of gap skills to find courses for.'
    });
  }

  const rawResult = await discoverCoursesForGaps(gapSkills);

  // Handle both shapes: z-ai returns a bare array, Gemini returns { courses, recommendation }
  const courses = Array.isArray(rawResult) ? rawResult : (rawResult.courses || []);
  const recommendation = !Array.isArray(rawResult) ? (rawResult.recommendation || '') : '';

  res.json({
    courses,
    recommendation,
    searchedGaps: gapSkills,
    count: courses.length
  });
});

// GET /api/ai/tech-trends
// Student/trainee: analyze their skills against current tech trends
const getTechTrendAnalysis = asyncHandler(async (req, res) => {
  const skills = await Skill.find({ user: req.user._id, status: 'VALIDATED' })
    .select('name score')
    .sort({ score: -1 });

  if (skills.length === 0) {
    return res.json({
      analysis: null,
      message: 'No verified skills found to analyze.'
    });
  }

  const skillNames = skills.map((s) => s.name);
  const analysis = await analyzeTechTrends(skillNames);

  res.json({
    analysis,
    skills: skillNames
  });
});

// POST /api/ai/skill-gap-analysis
// Candidate: AI analyzes profile data against target role / skills to compute exact skill gap
const skillGapAnalysis = asyncHandler(async (req, res) => {
  const { targetRole, requiredSkills } = req.body;

  const verifiedSkills = await Skill.find({ user: req.user._id, status: 'VALIDATED' })
    .select('name score category level')
    .sort({ score: -1 });

  const candidateProfile = {
    degree: req.user.degree,
    branch: req.user.branch,
    institution: req.user.institution,
    experienceYears: req.user.experienceYears || 0,
    priorCourses: req.user.priorCourses || [],
    selfReportedSkills: req.user.selfReportedSkills || [],
    verifiedSkills: verifiedSkills.map((s) => ({ name: s.name, score: s.score }))
  };

  const reqSkillsList = Array.isArray(requiredSkills) ? requiredSkills : [];
  const analysis = await analyzeSkillGap({
    candidateProfile,
    targetRole: targetRole || 'Technical Professional',
    requiredSkills: reqSkillsList
  });

  res.json({
    analysis,
    candidateProfile: {
      totalAcquiredSkills: candidateProfile.verifiedSkills.length + candidateProfile.selfReportedSkills.length,
      currentSkills: [...candidateProfile.verifiedSkills.map((s) => s.name), ...candidateProfile.selfReportedSkills]
    }
  });
});

router.post('/discover-jobs', protect, discoverJobs);
router.post('/discover-courses', protect, discoverCourses);
router.post('/skill-gap-analysis', protect, skillGapAnalysis);
router.get('/tech-trends', protect, getTechTrendAnalysis);

module.exports = router;
