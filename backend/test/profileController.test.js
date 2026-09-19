const test = require('node:test');
const assert = require('node:assert/strict');
const { updateMyProfile } = require('../src/controllers/profileController');

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function makeUser(overrides = {}) {
  const user = {
    name: 'Existing Student',
    email: 'student@example.com',
    phone: '9999999999',
    degree: 'B.Tech',
    selfReportedSkills: ['Old skill'],
    preferredJobLocations: ['Old location'],
    ...overrides,
    toPublicProfile() {
      return { ...this };
    },
    async save() {
      this.saved = true;
    }
  };
  return user;
}

async function update(body, user = makeUser()) {
  const req = { body, user };
  const res = makeResponse();
  let nextError;
  await updateMyProfile(req, res, (error) => { nextError = error; });
  assert.equal(nextError, undefined);
  return { user, res };
}

test('saves normalized skills and locations while preserving existing fields', async () => {
  const { user, res } = await update({
    name: 'Updated Student',
    selfReportedSkills: [' React ', 'Python', 'React'],
    preferredJobLocations: [' Bengaluru ', 'Remote', 'Bengaluru']
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(user.selfReportedSkills, ['React', 'Python']);
  assert.deepEqual(user.preferredJobLocations, ['Bengaluru', 'Remote']);
  assert.equal(user.name, 'Updated Student');
  assert.equal(user.degree, 'B.Tech');
  assert.equal(user.email, 'student@example.com');
  assert.equal(user.saved, true);
});

test('saves empty arrays and removes empty values before persistence', async () => {
  const { user, res } = await update({
    selfReportedSkills: [],
    preferredJobLocations: []
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(user.selfReportedSkills, []);
  assert.deepEqual(user.preferredJobLocations, []);
});

test('rejects invalid list field types without changing the profile', async () => {
  const user = makeUser();
  const before = { ...user };
  const { res } = await update({ selfReportedSkills: 'JavaScript' }, user);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /selfReportedSkills must be an array/);
  assert.deepEqual(user.selfReportedSkills, before.selfReportedSkills);
  assert.equal(user.saved, undefined);
});

test('rejects empty or non-string list entries', async () => {
  const { res } = await update({ preferredJobLocations: ['Delhi', '   ', 42] });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /preferredJobLocations must contain only non-empty strings/);
});