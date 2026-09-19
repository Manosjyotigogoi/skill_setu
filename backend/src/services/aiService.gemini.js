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
// 2. Job Discovery via Web Search
// ---------------------------------------------------------------------------
// Gemini doesn't have a built-in web search function like z-ai does, so we
// return a curated set of job-board search URLs based on the student's skills.
// The student can click through to see live results on LinkedIn/Naukri/Indeed.

async function discoverJobsForSkills(skills, location = 'India') {
  const skillNames = skills.map((s) => s.name);

  // Build search-URL-based results — these always work and don't require
  // a live web-search API.
  const boards = [
    {
      source: 'LinkedIn',
      buildUrl: (q, loc) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(q)}&location=${encodeURIComponent(loc)}`
    },
    {
      source: 'Naukri',
      buildUrl: (q, loc) => `https://www.naukri.com/${encodeURIComponent(q)}-jobs-in-${encodeURIComponent(loc)}`
    },
    {
      source: 'Indeed',
      buildUrl: (q, loc) => `https://www.indeed.co.in/jobs?q=${encodeURIComponent(q)}&l=${encodeURIComponent(loc)}`
    },
    {
      source: 'Foundit',
      buildUrl: (q, loc) => `https://www.foundit.in/srp/results?query=${encodeURIComponent(q)}&searchId=&searchType=&experience=&location=${encodeURIComponent(loc)}`
    }
  ];

  const query = skillNames.slice(0, 3).join(' ');

  // Also ask Gemini for a 2-sentence market insight per skill set
  let insight = '';
  try {
    const insightPrompt = `A candidate has these verified skills: ${skillNames.join(', ')}.
They are looking for jobs in ${location}. In 2-3 sentences, give a brief market insight:
which roles are they most likely to qualify for, and what's the current demand outlook?
Respond with plain prose, no JSON.`;
    insight = await generate(insightPrompt);
  } catch {
    insight = '';
  }

  const jobs = boards.map((b) => ({
    title: `${skillNames.slice(0, 2).join(' / ')} jobs on ${b.source}`,
    url: b.buildUrl(query, location),
    snippet: `Live job postings for ${query} in ${location} on ${b.source}. Click to view current openings.`,
    source: b.source,
    date: new Date().toISOString()
  }));

  return { jobs, insight };
}

// ---------------------------------------------------------------------------
// 3. Course Discovery
// ---------------------------------------------------------------------------
// Same approach — build curated search URLs for SWAYAM / NPTEL / Coursera.

async function discoverCoursesForGaps(gapSkills) {
  const boards = [
    {
      source: 'SWAYAM',
      buildUrl: (q) => `https://swayam.gov.in/explorer?action=Explore&keyword=${encodeURIComponent(q)}`
    },
    {
      source: 'NPTEL',
      buildUrl: (q) => `https://nptel.ac.in/course.html?topic=${encodeURIComponent(q)}`
    },
    {
      source: 'Coursera',
      buildUrl: (q) => `https://www.coursera.org/search?query=${encodeURIComponent(q)}`
    },
    {
      source: 'edX',
      buildUrl: (q) => `https://www.edx.org/search?q=${encodeURIComponent(q)}`
    },
    {
      source: 'Udemy',
      buildUrl: (q) => `https://www.udemy.com/courses/search/?q=${encodeURIComponent(q)}`
    }
  ];

  // Generate one set of results per gap skill so the student can drill in.
  const courses = [];
  for (const skill of gapSkills.slice(0, 5)) {
    for (const b of boards) {
      courses.push({
        title: `${skill} courses on ${b.source}`,
        url: b.buildUrl(skill),
        snippet: `Browse ${b.source} courses covering ${skill}. Filter by free/certified/NSQF-aligned as needed.`,
        source: b.source,
        date: new Date().toISOString()
      });
    }
  }

  // Ask Gemini for a brief learning-path recommendation
  let recommendation = '';
  try {
    const recPrompt = `A student has these skill gaps to bridge: ${gapSkills.join(', ')}.
In 2-3 sentences, recommend a logical learning order (which skill to learn first, second, etc.)
and mention any prerequisites. Respond with plain prose.`;
    recommendation = await generate(recPrompt);
  } catch {
    recommendation = '';
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

module.exports = {
  analyzeTrainingProgram,
  discoverJobsForSkills,
  discoverCoursesForGaps,
  analyzeTechTrends
};
