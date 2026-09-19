const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const User = require('../src/models/User');

test('User schema default readinessScore is 0 and targetRoleIds defaults to []', () => {
  const user = new User({
    name: 'Test Student',
    email: 'test_student@example.com'
  });

  assert.equal(user.readinessScore, 0);
  assert.deepEqual(user.targetRoleIds, []);
  
  const publicProfile = user.toPublicProfile();
  assert.equal(publicProfile.readinessScore, 0);
  assert.deepEqual(publicProfile.targetRoleIds, []);
});

test('User toPublicProfile returns string array for targetRoleIds', () => {
  const roleId1 = new mongoose.Types.ObjectId();
  const roleId2 = new mongoose.Types.ObjectId();
  const user = new User({
    name: 'Test Student 2',
    email: 'test_student2@example.com',
    targetRoleIds: [roleId1, roleId2]
  });

  const publicProfile = user.toPublicProfile();
  assert.deepEqual(publicProfile.targetRoleIds, [roleId1.toString(), roleId2.toString()]);
});

test('targetRoleRoutes exposes /all route before /:id', () => {
  const router = require('../src/routes/targetRoleRoutes');
  const routes = router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({ path: layer.route.path, method: Object.keys(layer.route.methods)[0] }));

  const allRouteIndex = routes.findIndex((r) => r.path === '/all');
  const idRouteIndex = routes.findIndex((r) => r.path === '/:id');

  assert.ok(allRouteIndex !== -1, '/all route should exist');
  assert.ok(idRouteIndex !== -1, '/:id route should exist');
  assert.ok(allRouteIndex < idRouteIndex, '/all must be declared before /:id');
});

test('profileController updateMyProfile updates targetRoleIds and filters invalid ObjectIds', async () => {
  const { updateMyProfile } = require('../src/controllers/profileController');

  const validId1 = new mongoose.Types.ObjectId().toString();
  const validId2 = new mongoose.Types.ObjectId().toString();

  const user = new User({
    name: 'Test Student 3',
    email: 'test_student3@example.com',
    targetRoleIds: []
  });
  user.save = async () => {};

  const req = {
    user,
    body: {
      targetRoleIds: [validId1, 'invalid-id-xyz', validId2, validId1] // includes duplicates & invalid id
    }
  };

  let responseData = null;
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  await updateMyProfile(req, res);

  assert.ok(responseData, 'Response data should be returned');
  assert.deepEqual(responseData.profile.targetRoleIds, [validId1, validId2]);
});

test('recomputeProfileStats resets readinessScore to 0 when user has no validated skills', async () => {
  const { recomputeProfileStats } = require('../src/utils/recomputeProfile');
  const Skill = require('../src/models/Skill');

  const user = new User({
    name: 'Test Student 4',
    email: 'test_student4@example.com',
    readinessScore: 30 // legacy score
  });

  user.save = async () => {};

  const origFind = Skill.find;
  Skill.find = () => ({
    lean: async () => []
  });

  try {
    await recomputeProfileStats(user);
    assert.equal(user.readinessScore, 0);
    assert.equal(user.verifiedSkillsCount, 0);
  } finally {
    Skill.find = origFind;
  }
});
