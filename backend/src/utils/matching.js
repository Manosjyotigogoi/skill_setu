// Shared logic for comparing a candidate's verified skills against
// what a target career role or a campus drive is looking for.
// This is intentionally simple (substring match on normalized names) —
// swap in a real taxonomy/embedding-based matcher later if needed.

function normalize(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findBestSkillMatch(userSkills, targetName) {
  const target = normalize(targetName);
  let best = null;

  userSkills.forEach((skill) => {
    const candidate = normalize(skill.name);
    if (!candidate || !target) return;
    if (candidate === target || candidate.includes(target) || target.includes(candidate)) {
      if (!best || skill.score > best.score) {
        best = skill;
      }
    }
  });

  return best;
}

// requiredSkills: [{ name, requiredScore }]
// returns annotated list + overall match percentage
function annotateRoleMatch(userSkills, requiredSkills) {
  const annotated = requiredSkills.map((req) => {
    const match = findBestSkillMatch(userSkills, req.name);
    const requiredScore = req.requiredScore ?? 70;

    if (match && match.score >= requiredScore) {
      return {
        name: req.name,
        status: 'VERIFIED',
        score: match.score,
        requiredScore
      };
    }

    return {
      name: req.name,
      status: 'GAP',
      currentScore: match ? match.score : 0,
      requiredScore
    };
  });

  const verifiedCount = annotated.filter((s) => s.status === 'VERIFIED').length;
  const matchPercentage = annotated.length
    ? Math.round((verifiedCount / annotated.length) * 100)
    : 0;

  return { requiredSkills: annotated, matchPercentage };
}

// requiredSkills: [String] (no thresholds — presence is enough, mirrors a drive's simple skill checklist)
function annotateDriveMatch(userSkills, requiredSkills) {
  const matchedSkills = [];
  const missingSkills = [];

  requiredSkills.forEach((name) => {
    const match = findBestSkillMatch(userSkills, name);
    if (match) {
      matchedSkills.push(name);
    } else {
      missingSkills.push(name);
    }
  });

  const matchPercentage = requiredSkills.length
    ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
    : 100;

  return { matchedSkills, missingSkills, matchPercentage };
}

module.exports = { normalize, findBestSkillMatch, annotateRoleMatch, annotateDriveMatch };
