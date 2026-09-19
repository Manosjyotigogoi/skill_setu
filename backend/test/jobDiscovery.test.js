const test = require('node:test');
const assert = require('node:assert/strict');
const {
  discoverJobsForSkills,
  matchJobToSkills,
  normalizeJob
} = require('../src/services/aiService');

const originalFetch = global.fetch;
const originalEnv = {
  provider: process.env.JOB_SEARCH_PROVIDER,
  key: process.env.JOB_SEARCH_API_KEY,
  url: process.env.JOB_SEARCH_API_URL,
  id: process.env.JOB_SEARCH_API_ID
};

function useProvider() {
  process.env.JOB_SEARCH_PROVIDER = 'test-provider';
  process.env.JOB_SEARCH_API_KEY = 'test-key';
  process.env.JOB_SEARCH_API_URL = 'https://provider.example/jobs';
  delete process.env.JOB_SEARCH_API_ID;
}

test.afterEach(() => {
  global.fetch = originalFetch;
  process.env.JOB_SEARCH_PROVIDER = originalEnv.provider;
  process.env.JOB_SEARCH_API_KEY = originalEnv.key;
  process.env.JOB_SEARCH_API_URL = originalEnv.url;
  if (originalEnv.id === undefined) delete process.env.JOB_SEARCH_API_ID;
  else process.env.JOB_SEARCH_API_ID = originalEnv.id;
});

test('normalizes provider jobs, removes duplicates, and calculates matches', async () => {
  useProvider();
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      results: [
        { id: '1', title: 'Node.js Engineer', company: { display_name: 'Acme' }, location: { display_name: 'Pune' }, description: 'Build Node.js services with React.', redirect_url: 'https://jobs.example/1', created: '2026-09-10', contract_type: 'full_time' },
        { id: 'duplicate', title: 'Node.js Engineer', company: 'Acme', redirect_url: 'https://jobs.example/1' },
        { id: '2', title: null, company: null, description: null, redirect_url: 'https://jobs.example/2' }
      ]
    })
  });

  const result = await discoverJobsForSkills([{ name: 'Node.js' }, { name: 'React' }, { name: 'Python' }], 'Pune');
  assert.equal(result.jobs.length, 2);
  const acmeJob = result.jobs.find((job) => job.company === 'Acme');
  assert.equal(acmeJob.matchPercentage, 67);
  assert.deepEqual(acmeJob.matchedSkills, ['Node.js', 'React']);
  assert.deepEqual(acmeJob.missingSkills, ['Python']);
  assert.ok(result.jobs.some((job) => job.company === 'Company not listed'));
  assert.equal(acmeJob.isFallback, undefined);
});

test('returns fallback search links when provider fails', async () => {
  useProvider();
  global.fetch = async () => { throw new Error('rate limited'); };

  const result = await discoverJobsForSkills([{ name: 'JavaScript' }], 'Delhi');
  assert.equal(result.jobs.length, 4);
  assert.ok(result.jobs.every((job) => job.isFallback === true));
  assert.match(result.providerError, /temporarily unavailable/);
  assert.ok(result.jobs.every((job) => job.url.startsWith('https://')));
});

test('returns a clear fallback state without provider credentials', async () => {
  delete process.env.JOB_SEARCH_PROVIDER;
  delete process.env.JOB_SEARCH_API_KEY;
  delete process.env.JOB_SEARCH_API_URL;

  const result = await discoverJobsForSkills([{ name: 'SQL' }], 'India');
  assert.equal(result.jobs.length, 4);
  assert.match(result.providerError, /No job provider is configured/);
});

test('handles empty profiles and malformed standalone records', () => {
  assert.deepEqual(matchJobToSkills({ title: 'Anything', description: '' }, []), {
    matchPercentage: 0,
    matchedSkills: [],
    missingSkills: []
  });
  assert.equal(normalizeJob({ title: 'Bad URL', url: 'javascript:alert(1)' }, [], 'test'), null);
});
