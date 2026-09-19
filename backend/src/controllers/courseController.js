const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/courses — catalog merged with my enrollment state
const getCourses = asyncHandler(async (req, res) => {
  const [courses, myEnrollments] = await Promise.all([
    Course.find().sort({ createdAt: 1 }),
    Enrollment.find({ user: req.user._id })
  ]);

  const byCourseId = new Map(myEnrollments.map((e) => [e.course.toString(), e]));

  const merged = courses.map((course) => {
    const enrollment = byCourseId.get(course._id.toString());
    return {
      id: course._id,
      title: course.title,
      provider: course.provider,
      url: course.url,
      skills: course.skills || course.bridgesSkills,
      level: course.level || 'Beginner',
      duration: course.duration,
      free: course.free !== false,
      freeStatus: course.freeStatus || '100% Free',
      platform: course.platform || course.provider,
      instructor: course.instructor,
      credits: course.credits,
      rating: course.rating,
      enrolledCount: course.enrolledCount,
      bridgesSkills: course.bridgesSkills || course.skills,
      accreditation: course.accreditation,
      badgeColor: course.badgeColor,
      enrolled: Boolean(enrollment && enrollment.enrolled),
      progress: enrollment ? enrollment.progress : 0
    };
  });

  res.json({ courses: merged });
});

// GET /api/courses/recommendations?skills=Python,Docker — returns free courses matching missing skills
const getRecommendedCourses = asyncHandler(async (req, res) => {
  const { skills, gaps } = req.query;
  const rawSkills = skills || gaps || '';
  const skillList = String(rawSkills)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (skillList.length === 0) {
    return res.json({ courses: [], message: 'Provide comma-separated skills in query: ?skills=Python,Docker' });
  }

  const regexList = skillList.map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

  const matching = await Course.find({
    free: true,
    $or: [
      { skills: { $in: regexList } },
      { bridgesSkills: { $in: regexList } },
      { title: { $in: regexList } }
    ]
  }).limit(20);

  const [myEnrollments] = await Promise.all([
    Enrollment.find({ user: req.user._id })
  ]);
  const byCourseId = new Map(myEnrollments.map((e) => [e.course.toString(), e]));

  const scored = matching.map((course) => {
    const courseSkills = [...(course.skills || []), ...(course.bridgesSkills || [])].map((s) => s.toLowerCase());
    const matched = skillList.filter((sk) => courseSkills.some((cs) => cs.includes(sk.toLowerCase()) || sk.toLowerCase().includes(cs)));
    const enrollment = byCourseId.get(course._id.toString());
    return {
      id: course._id,
      title: course.title,
      provider: course.provider,
      url: course.url,
      skills: course.skills,
      level: course.level,
      duration: course.duration,
      free: course.free,
      freeStatus: course.freeStatus,
      platform: course.platform || course.provider,
      instructor: course.instructor,
      rating: course.rating,
      enrolledCount: course.enrolledCount,
      bridgesSkills: course.bridgesSkills,
      accreditation: course.accreditation,
      badgeColor: course.badgeColor,
      enrolled: Boolean(enrollment && enrollment.enrolled),
      progress: enrollment ? enrollment.progress : 0,
      matchedSkills: matched,
      matchCount: matched.length
    };
  });

  scored.sort((a, b) => b.matchCount - a.matchCount || b.rating - a.rating);
  res.json({ courses: scored, requestedSkills: skillList });
});


// POST /api/courses/:id/enroll — toggles enrollment, mirrors the frontend's toggleCourseEnrollment
const toggleEnrollment = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found.' });

  let enrollment = await Enrollment.findOne({ user: req.user._id, course: course._id });

  if (!enrollment) {
    enrollment = await Enrollment.create({
      user: req.user._id,
      course: course._id,
      enrolled: true,
      progress: 10
    });
    course.enrolledCount += 1;
    await course.save();
    return res.json({ enrolled: true, progress: enrollment.progress });
  }

  enrollment.enrolled = !enrollment.enrolled;
  enrollment.progress = enrollment.enrolled ? enrollment.progress || 10 : 0;
  await enrollment.save();

  res.json({ enrolled: enrollment.enrolled, progress: enrollment.progress });
});

// PATCH /api/courses/:id/progress  { progress }
const updateProgress = asyncHandler(async (req, res) => {
  const { progress } = req.body;
  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    return res.status(400).json({ message: 'progress must be a number between 0 and 100.' });
  }

  const enrollment = await Enrollment.findOne({ user: req.user._id, course: req.params.id });
  if (!enrollment || !enrollment.enrolled) {
    return res.status(404).json({ message: 'You are not enrolled in this course.' });
  }

  enrollment.progress = progress;
  await enrollment.save();
  res.json({ progress: enrollment.progress });
});

module.exports = { getCourses, getRecommendedCourses, toggleEnrollment, updateProgress };

