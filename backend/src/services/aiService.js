// AI service module — Google Gemini edition.
//
// Replaces the z-ai-web-dev-sdk with @google/generative-ai so the project
// runs on any machine (not just inside the Z.ai sandbox).
//
// Setup:
//   1. npm install @google/generative-ai
//   2. Get a free API key from https://aistudio.google.com/app/apikey
//   3. Add to backend/.env:  GEMINI_API_KEY=AIzaSy...your-key
//
// The free tier allows 15 requests/minute — plenty for a dev/demo environment.

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Course = require('../models/Course');


let _genAI = null;
let _model = null;

function getModel() {
  if (_model) return _model;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in backend/.env. Get a free key from https://aistudio.google.com/app/apikey');
  }
  _genAI = new GoogleGenerativeAI(apiKey);
  // Model is configurable via env var. Defaults to gemini-1.5-flash (free tier).
  // Other options:
  //   gemini-1.5-flash-8b   — even faster, smaller free quota
  //   gemini-1.5-pro         — higher quality, lower free quota (2 req/min)
  //   gemini-2.0-flash-exp  — Gemini 2.0 Flash (experimental, free)
  //   gemini-2.5-flash       — Gemini 2.5 Flash (newest, if available on your key)
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  _model = _genAI.getGenerativeModel({ model: modelName });
  return _model;
}

// Helper: call Gemini and extract the text response.
async function generate(prompt, systemInstruction) {
  const model = getModel();
  const fullPrompt = systemInstruction
    ? `${systemInstruction}\n\n${prompt}`
    : prompt;

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  return text;
}

// Helper: call Gemini and parse the response as JSON.
// Gemini sometimes wraps JSON in ```json fences — we strip those.
async function generateJSON(prompt, systemInstruction) {
  const raw = await generate(prompt, systemInstruction);
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return { _raw: raw, _parseError: 'Could not parse JSON' };
  }
}

// ---------------------------------------------------------------------------
// 1. Training Program Impact Analysis
// ---------------------------------------------------------------------------

async function analyzeTrainingProgram(program, placementCount, companyDemandCount) {
  const systemInstruction = `You are an expert skills economist for the Indian technical education ecosystem.
You analyze training programs and produce a structured impact assessment.

You ALWAYS respond with valid JSON only (no markdown, no prose outside JSON) with this exact shape:
{
  "techAlignmentScore": <number 0-100>,
  "techAlignmentReasoning": "<string>",
  "overallImpact": "<string: HIGH | MODERATE | LOW>",
  "summary": "<2-3 sentence summary>",
  "recommendations": ["<string>", "<string>", ...]
}`;

  const prompt = `Analyze this training program:

Title: ${program.title}
Provider: ${program.provider || 'N/A'}
Description: ${program.description || 'N/A'}
Duration: ${program.durationWeeks || 'N/A'} weeks
Skills taught: ${program.taughtSkills.map((s) => s.name).join(', ')}
Tech focus areas: ${program.techFocusAreas.join(', ') || 'N/A'}

Hard metrics:
- Trainees placed in jobs after this training: ${placementCount}
- Companies currently hiring for these skills (active drives): ${companyDemandCount}

Score the program's alignment with upcoming/emerging technology trends (AI/ML, Cloud Native, Web3, Quantum, Edge Computing, Sustainable Tech, etc.) on a scale of 0-100, where 100 means perfectly aligned with the most in-demand emerging tech and 0 means completely obsolete.

Then provide an overall impact rating, a summary, and 3-5 actionable recommendations for improving the program.

Respond with JSON only.`;

  const result = await generateJSON(prompt, systemInstruction);
  return {
    techAlignmentScore: result.techAlignmentScore ?? 0,
    techAlignmentReasoning: result.techAlignmentReasoning || '',
    overallImpact: result.overallImpact || 'UNKNOWN',
    summary: result.summary || '',
    recommendations: result.recommendations || []
  };
}

// ---------------------------------------------------------------------------
// 2. Job Discovery via a configured provider
// ---------------------------------------------------------------------------

const JOB_CACHE_TTL_MS = 5 * 60 * 1000;
const JOB_RESULT_LIMIT = 20;
const jobCache = new Map();

function cleanText(value, maxLength = 2000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function validHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function normalizedJobKey(job) {
  const normalize = (value) => cleanText(value, 200).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return job.url || `${normalize(job.title)}|${normalize(job.company)}`;
}

function matchJobToSkills(job, skills) {
  const searchableText = `${job.title} ${job.description}`
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .replace(/[.#]+/g, ' ');
  const matchedSkills = [];
  const missingSkills = [];

  skills.forEach((skill) => {
    const name = cleanText(skill.name, 80);
    if (!name) return;
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').replace(/[.#]+/g, ' ').trim();
    const matched = Boolean(normalizedName) && searchableText.includes(normalizedName);
    (matched ? matchedSkills : missingSkills).push(name);
  });

  const matchPercentage = skills.length
    ? Math.round((matchedSkills.length / skills.length) * 100)
    : 0;
  return { matchPercentage, matchedSkills, missingSkills };
}

function normalizeJob(raw, skills, source) {
  let salaryStr = '';
  if (raw?.salary) {
    salaryStr = cleanText(raw.salary, 120);
  } else if (raw?.salary_min || raw?.salary_max) {
    const min = raw.salary_min ? `₹${Math.round(raw.salary_min).toLocaleString('en-IN')}` : '';
    const max = raw.salary_max ? `₹${Math.round(raw.salary_max).toLocaleString('en-IN')}` : '';
    salaryStr = min && max ? `${min} - ${max}` : (min || max);
  }

  const job = {
    title: cleanText(raw?.title || raw?.name || 'Untitled Opportunity', 180),
    company: cleanText(raw?.company?.display_name || raw?.company?.name || raw?.company || 'Company not listed', 160),
    location: cleanText(raw?.location?.display_name || raw?.location?.name || raw?.location || 'India', 160),
    description: cleanText(raw?.description || raw?.snippet || raw?.summary || '', 2400),
    url: validHttpUrl(raw?.redirect_url || raw?.url || raw?.link),
    source: cleanText(raw?.source || source || 'Adzuna', 80),
    postedDate: cleanText(raw?.created || raw?.postedDate || raw?.date || '', 80),
    employmentType: cleanText(raw?.contract_type || raw?.contract_time || raw?.employmentType || raw?.job_type || 'Full Time', 80),
    salary: salaryStr
  };

  if (!job.url || !job.title) return null;
  return { id: cleanText(raw?.id || job.url, 200), ...job, ...matchJobToSkills(job, skills) };
}

function providerConfig() {
  const provider = (process.env.JOB_SEARCH_PROVIDER || 'adzuna').trim().toLowerCase();
  const apiKey = (process.env.JOB_SEARCH_API_KEY || '').trim();
  const appId = (process.env.JOB_SEARCH_API_ID || '').trim();
  const apiUrl = (process.env.JOB_SEARCH_API_URL || 'https://api.adzuna.com/v1/api/jobs/in/search/1').trim();

  if (provider === 'adzuna') {
    // Adzuna requires app_id and app_key. Support either separate vars or id:key in apiKey
    const [extractedId, extractedKey] = apiKey.includes(':') ? apiKey.split(':', 2) : [appId, apiKey];
    const finalId = appId || extractedId;
    const finalKey = extractedKey || apiKey;
    if (!finalId || !finalKey) {
      return { provider: 'adzuna', missingCredentials: true, apiUrl };
    }
    return { provider: 'adzuna', appId: finalId, apiKey: finalKey, apiUrl };
  }

  if (!apiKey || !apiUrl) return null;
  return { provider, apiKey, apiUrl };
}

async function fetchProviderJobs(skills, location, config) {
  const query = skills.map((skill) => cleanText(skill.name, 80)).filter(Boolean).slice(0, 5).join(' ');
  const url = new URL(config.apiUrl);
  let headers = { Accept: 'application/json' };

  if (config.provider === 'adzuna') {
    url.searchParams.set('app_id', config.appId);
    url.searchParams.set('app_key', config.apiKey);
    url.searchParams.set('what', query || 'software engineer');
    if (location) url.searchParams.set('where', cleanText(location, 100));
    url.searchParams.set('results_per_page', String(JOB_RESULT_LIMIT));
    url.searchParams.set('content-type', 'application/json');
  } else {
    url.searchParams.set('q', query);
    if (location) url.searchParams.set('location', cleanText(location, 100));
    headers = { ...headers, Authorization: `Bearer ${config.apiKey}` };
  }

  const response = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Adzuna API returned ${response.status}: ${errText.slice(0, 120)}`);
  }
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : (payload.results || payload.jobs || payload.data || []);
  if (!Array.isArray(rows)) throw new Error('Invalid result format from job provider');
  return rows.map((row) => normalizeJob(row, skills, 'Adzuna')).filter(Boolean);
}

async function discoverJobsForSkills(skills, location = 'India') {
  const safeSkills = (Array.isArray(skills) ? skills : [])
    .map((skill) => ({ name: cleanText(skill?.name, 80), score: Number(skill?.score) || 0 }))
    .filter((skill) => skill.name);
  const safeLocation = cleanText(location, 100) || 'India';
  if (safeSkills.length === 0) return { jobs: [], insight: '', providerError: '' };

  const cacheKey = JSON.stringify({ skills: safeSkills.map((skill) => skill.name.toLowerCase()).sort(), location: safeLocation.toLowerCase() });
  const cached = jobCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const config = providerConfig();
  let jobs = [];
  let providerError = '';

  if (config && !config.missingCredentials) {
    try {
      jobs = await fetchProviderJobs(safeSkills, safeLocation, config);
    } catch (error) {
      console.warn('Live Adzuna API query error:', error.message);
      providerError = `Adzuna live job provider: ${error.message}`;
      jobs = [];
    }
  } else {
    providerError = 'Live job provider (Adzuna) credentials are not yet configured. Please set JOB_SEARCH_API_ID and JOB_SEARCH_API_KEY in backend/.env to view live job listings.';
    jobs = [];
  }

  const uniqueJobsByKey = new Map();
  jobs.forEach((job) => {
    const key = normalizedJobKey(job);
    const existing = uniqueJobsByKey.get(key);
    if (!existing || (job.description.length + job.company.length) > (existing.description.length + existing.company.length)) {
      uniqueJobsByKey.set(key, job);
    }
  });
  const uniqueJobs = [...uniqueJobsByKey.values()].slice(0, JOB_RESULT_LIMIT);

  let insight = '';
  try {
    insight = await generate(`A candidate has these verified skills: ${safeSkills.map((skill) => skill.name).join(', ')}.\nThey are looking for jobs in ${safeLocation}. In 2-3 sentences, give a brief market insight about likely roles and demand outlook. Respond with plain prose, no JSON.`);
  } catch {
    // Graceful fallback if Gemini is rate-limited or key not set
  }

  const value = { jobs: uniqueJobs, insight, providerError };
  jobCache.set(cacheKey, { value, expiresAt: Date.now() + JOB_CACHE_TTL_MS });
  return value;
}

// ---------------------------------------------------------------------------
// 3. Course Discovery (MongoDB-backed 100% Free Learning Resources)
// ---------------------------------------------------------------------------

async function discoverCoursesForGaps(gapSkills) {
  if (!Array.isArray(gapSkills) || gapSkills.length === 0) {
    return { courses: [], recommendation: '' };
  }

  // Find real free courses in MongoDB matching the missing gap skills
  const regexPatterns = gapSkills.map((s) => new RegExp(cleanText(s, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

  const matchingCourses = await Course.find({
    free: true,
    $or: [
      { skills: { $in: regexPatterns } },
      { bridgesSkills: { $in: regexPatterns } },
      { title: { $in: regexPatterns } }
    ]
  }).limit(20);

  // Score each course by how many gap skills it bridges
  const normalizedGaps = gapSkills.map((g) => cleanText(g, 50).toLowerCase());
  const scored = matchingCourses.map((c) => {
    const courseSkills = [...(c.skills || []), ...(c.bridgesSkills || [])].map((s) => String(s).toLowerCase());
    const matchedGaps = normalizedGaps.filter((g) => courseSkills.some((cs) => cs.includes(g) || g.includes(cs)));
    return {
      course: c,
      matchCount: matchedGaps.length,
      matchedGaps
    };
  });

  scored.sort((a, b) => b.matchCount - a.matchCount || (b.course.rating || 0) - (a.course.rating || 0));

  const courses = scored.map(({ course, matchedGaps }) => ({
    id: course._id,
    title: course.title,
    provider: course.provider,
    url: course.url,
    skills: course.skills,
    level: course.level,
    duration: course.duration,
    free: course.free,
    freeStatus: course.freeStatus || '100% Free',
    platform: course.platform || course.provider,
    instructor: course.instructor,
    rating: course.rating,
    enrolledCount: course.enrolledCount,
    bridgesSkills: course.bridgesSkills,
    accreditation: course.accreditation,
    badgeColor: course.badgeColor,
    matchedGaps
  }));

  // Ask Gemini for a brief learning-path recommendation
  let recommendation = '';
  try {
    const recPrompt = `A student has these skill gaps to bridge: ${gapSkills.join(', ')}.
They have available free courses from platforms like freeCodeCamp, Khan Academy, MIT OpenCourseWare, SWAYAM, edX, and YouTube.
In 2-3 actionable sentences, recommend a logical learning order (which skill to prioritize first, second, etc.) and best practice for completing projects. Respond in plain prose without JSON.`;
    recommendation = await generate(recPrompt);
  } catch {
    recommendation = `Recommended learning path: Prioritize foundational competencies (${gapSkills.slice(0, 2).join(', ')}), followed by advanced framework integration and deployment projects.`;
  }

  return { courses, recommendation };
}


// ---------------------------------------------------------------------------
// 4. Tech Trend Analysis
// ---------------------------------------------------------------------------

async function analyzeTechTrends(skillNames) {
  const systemInstruction = `You are a technology trend analyst with deep knowledge of the Indian IT job market.
Respond ONLY with valid JSON (no markdown fences, no prose outside JSON) in this exact shape:
{
  "overallRelevanceScore": <number 0-100>,
  "skillScores": [{ "skill": "<string>", "score": <number>, "reasoning": "<string>" }],
  "emergingSkillsToLearn": ["<string>", ...],
  "summary": "<string>"
}`;

  const prompt = `Score these skills against current and emerging technology trends for 2025-2026:
${skillNames.join(', ')}

For each skill, give:
- A score from 0-100 reflecting its current market demand + future growth trajectory
- A 1-sentence reasoning

Also provide:
- An overall relevance score (0-100) for the candidate's combined skill set
- 3-5 emerging skills they should consider learning next
- A 2-sentence summary

Respond with JSON only. Use your training knowledge — you do not need to search the web.`;

  const result = await generateJSON(prompt, systemInstruction);
  return {
    overallRelevanceScore: result.overallRelevanceScore ?? 0,
    skillScores: result.skillScores || [],
    emergingSkillsToLearn: result.emergingSkillsToLearn || [],
    summary: result.summary || ''
  };
}

// ---------------------------------------------------------------------------
// 5. AI Skill Gap Analysis
// ---------------------------------------------------------------------------

async function analyzeSkillGap({ candidateProfile, targetRole, requiredSkills = [] }) {
  const currentSkills = [
    ...(candidateProfile.verifiedSkills || []).map((s) => s.name || s),
    ...(candidateProfile.selfReportedSkills || [])
  ];

  const systemInstruction = `You are an expert AI Career & Skill Coach for technical students and vocational trainees in India.
Analyze the candidate's current skills and profile against the target job role or required skills.
Return strictly valid JSON only:
{
  "matchPercentage": <number 0-100>,
  "matchedSkills": ["<skill1>", "<skill2>"],
  "skillGaps": [
    {
      "skill": "<skillName>",
      "severity": "CRITICAL" | "MODERATE" | "OPTIONAL",
      "reasoning": "<why this skill is needed for this role>"
    }
  ],
  "learningRoadmap": ["<step 1>", "<step 2>", "<step 3>"],
  "adzunaKeywords": "<3-5 space separated keywords for live job searching>"
}`;

  const prompt = `Candidate Profile:
- Role/Degree: ${candidateProfile.degree || candidateProfile.branch || 'Technical Candidate'}
- Current Acquired Skills: ${currentSkills.join(', ') || 'None specified'}
- Prior Courses/Certifications: ${(candidateProfile.priorCourses || []).join(', ') || 'None'}
- Experience: ${candidateProfile.experienceYears || 0} years

Target Job Role / Objective:
- Target Role: ${targetRole || 'Software Development / Core Engineering'}
- Required Skills: ${requiredSkills.join(', ') || 'Industry standard requirements'}

Identify the exact skill gap, calculate the match percentage, prioritize what to learn next, and provide live job search keywords for Adzuna.`;

  let result = null;
  try {
    result = await generateJSON(prompt, systemInstruction);
  } catch (err) {
    console.warn('AI Skill Gap Generation fallback:', err.message);
  }

  if (!result || typeof result.matchPercentage !== 'number') {
    // Graceful rule-based fallback if Gemini is rate-limited or key not set
    const matched = [];
    const missing = [];
    const normalizedCurrent = currentSkills.map((s) => String(s).toLowerCase().trim());

    requiredSkills.forEach((req) => {
      const norm = String(req).toLowerCase().trim();
      if (normalizedCurrent.some((c) => c.includes(norm) || norm.includes(c))) {
        matched.push(req);
      } else {
        missing.push({
          skill: req,
          severity: 'CRITICAL',
          reasoning: `Essential requirement for ${targetRole || 'this position'}`
        });
      }
    });

    const matchPercentage = requiredSkills.length > 0
      ? Math.round((matched.length / requiredSkills.length) * 100)
      : (currentSkills.length > 0 ? 75 : 30);

    result = {
      matchPercentage,
      matchedSkills: matched,
      skillGaps: missing,
      learningRoadmap: missing.map((m, idx) => `Step ${idx + 1}: Complete hands-on projects and tutorials for ${m.skill}`),
      adzunaKeywords: matched.slice(0, 3).join(' ') || targetRole || 'Developer'
    };
  }

  // Fetch real 100% free courses stored in MongoDB that bridge these specific missing skills
  const gapSkillNames = (result.skillGaps || []).map((g) => g.skill || g).filter(Boolean);
  let recommendedCourses = [];
  try {
    const discovery = await discoverCoursesForGaps(gapSkillNames);
    recommendedCourses = discovery.courses || [];
  } catch (err) {
    console.warn('Could not fetch MongoDB courses for skill gap:', err.message);
  }

  return {
    ...result,
    recommendedCourses
  };
}


module.exports = {
  analyzeTrainingProgram,
  discoverJobsForSkills,
  matchJobToSkills,
  normalizeJob,
  discoverCoursesForGaps,
  analyzeTechTrends,
  analyzeSkillGap
};
