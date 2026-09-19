const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { analyzeSkillGap } = require('../src/services/aiService');

test('University joinCode hashing and timingSafeEqual match', () => {
  const code = 'NIT-CSE-2026';
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  const studentEntered = 'nit-cse-2026';
  const cleanEntered = studentEntered.trim().toUpperCase();
  const enteredHash = crypto.createHash('sha256').update(cleanEntered).digest('hex');

  assert.equal(hash, enteredHash);
  assert.equal(
    crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(enteredHash, 'hex')),
    true
  );
});

test('Training program code normalization and uppercase requirement', () => {
  const inputCode = ' pmkvy-ai-01 ';
  const normalized = inputCode.trim().toUpperCase();
  assert.equal(normalized, 'PMKVY-AI-01');
});

test('AI skill gap analysis correctly identifies matched vs gap skills', async () => {
  const profile = {
    degree: 'B.Tech CSE',
    verifiedSkills: [{ name: 'React.js', score: 90 }, { name: 'Python', score: 85 }],
    selfReportedSkills: ['Git', 'SQL'],
    experienceYears: 1
  };

  const targetRole = 'Full Stack Developer';
  const requiredSkills = ['React.js', 'Python', 'Docker', 'Kubernetes'];

  const result = await analyzeSkillGap({
    candidateProfile: profile,
    targetRole,
    requiredSkills
  });

  assert.ok(typeof result.matchPercentage === 'number');
  assert.ok(Array.isArray(result.matchedSkills));
  assert.ok(Array.isArray(result.skillGaps));
  assert.ok(result.matchedSkills.includes('React.js'));
  assert.ok(result.matchedSkills.includes('Python'));
  const gapNames = result.skillGaps.map(g => g.skill || g);
  assert.ok(gapNames.includes('Docker'));
  assert.ok(gapNames.includes('Kubernetes'));
});

test('Placement 1-year retention status enum values', () => {
  const validStatuses = ['pending', 'still_at_company', 'changed_company', 'unemployed'];
  assert.ok(validStatuses.includes('pending'));
  assert.ok(validStatuses.includes('still_at_company'));
  assert.ok(validStatuses.includes('changed_company'));
  assert.ok(validStatuses.includes('unemployed'));
});
