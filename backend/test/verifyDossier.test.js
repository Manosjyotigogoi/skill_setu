const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { verifyDossier } = require('../src/controllers/dossierController');
const User = require('../src/models/User');
const Skill = require('../src/models/Skill');
const Enrollment = require('../src/models/Enrollment');

test('verifyDossier returns candidate profile and validated skills for skillSetuId', async () => {
  const dummyUser = new User({
    name: 'Priya Patel',
    email: 'priya.test@skillsetu.gov.in',
    skillSetuId: 'SETU-TEST-9999',
    degree: 'B.Tech Computer Science',
    institution: 'IIT Madras',
    readinessScore: 88,
    sovereignStatus: 'VERIFIED_LINKED',
    targetRoleIds: []
  });

  const req = {
    params: { skillSetuId: 'SETU-TEST-9999' }
  };

  let responseData = null;
  let responseStatus = 200;
  const res = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  // Mock User.findOne, Skill.find, Skill.countDocuments, Enrollment.find
  const origFindOne = User.findOne;
  const origSkillFind = Skill.find;
  const origSkillCount = Skill.countDocuments;
  const origEnrollmentFind = Enrollment.find;

  try {
    User.findOne = () => ({
      populate: () => Promise.resolve(dummyUser),
      then: (resolve) => resolve(dummyUser)
    });
    Skill.find = () => ({
      sort: () => [
        { name: 'Python', score: 95, framework: 'Backend', status: 'VALIDATED' }
      ]
    });
    Skill.countDocuments = async () => 1;
    Enrollment.find = async () => [{ enrolled: true }];

    await verifyDossier(req, res);

    assert.equal(responseStatus, 200);
    assert.ok(responseData.verified);
    assert.equal(responseData.candidate.name, 'Priya Patel');
    assert.equal(responseData.candidate.skillSetuId, 'SETU-TEST-9999');
    assert.equal(responseData.candidate.degree, 'B.Tech Computer Science');
    assert.ok(responseData.signature);
    assert.ok(responseData.auditId.includes('SETU-'));
    assert.ok(responseData.academicCredits > 0);
    assert.equal(responseData.skills.length, 1);
    assert.equal(responseData.skills[0].name, 'Python');
  } finally {
    User.findOne = origFindOne;
    Skill.find = origSkillFind;
    Skill.countDocuments = origSkillCount;
    Enrollment.find = origEnrollmentFind;
  }
});

