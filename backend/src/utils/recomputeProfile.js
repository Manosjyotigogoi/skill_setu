const Skill = require('../models/Skill');

// Recomputes the cached dashboard figures on a User document from their
// actual Skill records, then saves. Call this any time skills change
// (exam pass, document extraction, admin revocation, etc.) so the
// dashboard never drifts out of sync with the source data.
async function recomputeProfileStats(user) {
  const skills = await Skill.find({ user: user._id, status: 'VALIDATED' }).lean();

  user.verifiedSkillsCount = skills.length;

  if (skills.length) {
    const avgScore = skills.reduce((sum, s) => sum + s.score, 0) / skills.length;
    // Readiness blends how many skills are verified with how strong they are.
    const breadthComponent = Math.min(skills.length * 6, 60); // up to 60 pts for breadth
    const strengthComponent = Math.round((avgScore / 100) * 40); // up to 40 pts for strength
    user.readinessScore = Math.min(breadthComponent + strengthComponent, 98);
  } else {
    user.readinessScore = 0;
  }

  await user.save();
  return user;
}

module.exports = { recomputeProfileStats };
