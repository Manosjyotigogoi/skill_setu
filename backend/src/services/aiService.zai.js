// AI service module — wraps z-ai-web-dev-sdk for the Skill-Setu backend.
//
// Uses the in-house SDK (z-ai-web-dev-sdk) which provides:
//   1. chat.completions.create() — LLM for analysis, summarization, recommendations
//   2. functions.invoke('web_search', { query, num }) — real-time web search
//
// Both are free API calls — no external API key needed.
//
// Different AI tasks use different prompt strategies (one model, different
// system prompts) to keep things simple while still being task-specific.

let _zai = null;

async function getZAI() {
  if (_zai) return _zai;
  const ZAI = require('z-ai-web-dev-sdk').default || require('z-ai-web-dev-sdk');
  _zai = await ZAI.create();
  return _zai;
}

// ---------------------------------------------------------------------------
// 1. Training Program Impact Analysis
// ---------------------------------------------------------------------------
// Analyzes a training program's effectiveness using three parameters:
//   a) Number of trainees who got jobs after completing this training
//   b) Number of companies currently demanding the skills taught
//   c) Alignment with upcoming tech trends (AI-scored 0-100)

async function analyzeTrainingProgram(program, placementCount, companyDemandCount) {
  const zai = await getZAI();

  const systemPrompt = `You are an expert skills economist for the Indian technical education ecosystem.
You analyze training programs and produce a structured impact assessment.

You ALWAYS respond in valid JSON (no markdown, no prose outside JSON) with this exact shape:
{
  "techAlignmentScore": <number 0-100>,
  "techAlignmentReasoning": "<string>",
  "overallImpact": "<string: HIGH | MODERATE | LOW>",
  "summary": "<2-3 sentence summary>",
  "recommendations": ["<string>", "<string>", ...]
}`;

  const userPrompt = `Analyze this training program:

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

Then provide an overall impact rating, a summary, and 3-5 actionable recommendations for improving the program.`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    thinking: { type: 'disabled' }
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return { techAlignmentScore: 0, summary: raw, recommendations: [] };
  }
}

// ---------------------------------------------------------------------------
// 2. Job Discovery via Web Search
// ---------------------------------------------------------------------------

async function discoverJobsForSkills(skills, location = 'India') {
  const zai = await getZAI();

  const skillNames = skills.map((s) => s.name).join(', ');
  const query = `${skillNames} jobs hiring ${location} 2025 2026 site:linkedin.com OR site:naukri.com OR site:indeed.co.in`;

  const results = await zai.functions.invoke('web_search', {
    query,
    num: 15
  });

  return (results || []).map((r) => ({
    title: r.name,
    url: r.url,
    snippet: r.snippet,
    source: r.host_name,
    date: r.date
  }));
}

// ---------------------------------------------------------------------------
// 3. Course Discovery via Web Search
// ---------------------------------------------------------------------------

async function discoverCoursesForGaps(gapSkills) {
  const zai = await getZAI();

  const query = `${gapSkills.join(', ')} online course SWAYAM NPTEL Coursera free certification 2025`;

  const results = await zai.functions.invoke('web_search', {
    query,
    num: 10
  });

  return (results || []).map((r) => ({
    title: r.name,
    url: r.url,
    snippet: r.snippet,
    source: r.host_name,
    date: r.date
  }));
}

// ---------------------------------------------------------------------------
// 4. Tech Trend Analysis
// ---------------------------------------------------------------------------

async function analyzeTechTrends(skillNames) {
  const zai = await getZAI();

  const trendResults = await zai.functions.invoke('web_search', {
    query: 'top emerging technology skills in demand 2025 2026 India IT jobs',
    num: 10
  });

  const trendContext = (trendResults || [])
    .slice(0, 8)
    .map((r, i) => `${i + 1}. ${r.name}\n${r.snippet}`)
    .join('\n\n');

  const systemPrompt = `You are a technology trend analyst. Respond ONLY in valid JSON:
{
  "overallRelevanceScore": <number 0-100>,
  "skillScores": [{ "skill": "<string>", "score": <number>, "reasoning": "<string>" }],
  "emergingSkillsToLearn": ["<string>", ...],
  "summary": "<string>"
}`;

  const userPrompt = `Current tech trends from web search:
${trendContext}

Score these skills against the trends: ${skillNames.join(', ')}`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    thinking: { type: 'disabled' }
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return { overallRelevanceScore: 0, summary: raw, skillScores: [] };
  }
}

module.exports = {
  analyzeTrainingProgram,
  discoverJobsForSkills,
  discoverCoursesForGaps,
  analyzeTechTrends
};
