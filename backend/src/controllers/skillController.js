const Skill = require('../models/Skill');
const asyncHandler = require('../utils/asyncHandler');
const { recomputeProfileStats } = require('../utils/recomputeProfile');

// GET /api/skills  (mine)
const getMySkills = asyncHandler(async (req, res) => {
  const skills = await Skill.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ skills });
});

// GET /api/skills/:id
const getSkillById = asyncHandler(async (req, res) => {
  const skill = await Skill.findOne({ _id: req.params.id, user: req.user._id });
  if (!skill) return res.status(404).json({ message: 'Skill not found.' });
  res.json({ skill });
});

// DELETE /api/skills/:id  — e.g. candidate retracts a self-reported skill
const deleteSkill = asyncHandler(async (req, res) => {
  const skill = await Skill.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!skill) return res.status(404).json({ message: 'Skill not found.' });

  await recomputeProfileStats(req.user);
  res.json({ message: 'Skill removed.' });
});

module.exports = { getMySkills, getSkillById, deleteSkill };
