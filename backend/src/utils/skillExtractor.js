// Rule-based skill extraction from document text.
//
// This is a pragmatic stand-in for a real OCR + NLP/LLM extraction pipeline:
// it scans extracted text for known skill keywords/aliases and reports
// whatever it finds. It is honest about its limits — no external AI model
// is called here. Swap `extractSkillsFromText` out for a real classifier
// or an LLM-backed extractor when one is available.

const SKILL_CATALOG = [
  { name: 'Data Structures & Algorithms', category: 'Core Computer Science', level: 'NSQF Level 7', aliases: ['data structures', 'algorithms', 'dsa'] },
  { name: 'React.js & Modern Frontend', category: 'Software Development', level: 'NSQF Level 7', aliases: ['react.js', 'reactjs', 'react '] },
  { name: 'Python for Data & Automation', category: 'Data & Systems', level: 'NSQF Level 6', aliases: ['python'] },
  { name: 'TypeScript & Static Architecture', category: 'Software Development', level: 'NSQF Level 7', aliases: ['typescript'] },
  { name: 'REST API & Microservices Integration', category: 'Backend & Systems', level: 'NSQF Level 7', aliases: ['rest api', 'restful', 'microservices'] },
  { name: 'HTML5 & Tailwind Design Systems', category: 'Frontend UI/UX', level: 'NSQF Level 6', aliases: ['html5', 'tailwind', 'html'] },
  { name: 'Git & Collaborative DevSecOps', category: 'Engineering Practices', level: 'NSQF Level 6', aliases: ['git', 'github', 'gitlab', 'ci/cd', 'devops'] },
  { name: 'SQL & Relational Schema Modeling', category: 'Database Systems', level: 'NSQF Level 6', aliases: ['sql', 'mysql', 'postgresql', 'relational database'] },
  { name: 'Docker & Microservices Deployment', category: 'Cloud Systems', level: 'NSQF Level 7', aliases: ['docker', 'containerization', 'containers'] },
  { name: 'Kubernetes Orchestration', category: 'Cloud Systems', level: 'NSQF Level 7', aliases: ['kubernetes', 'k8s'] },
  { name: 'AWS / Azure Infrastructure', category: 'Cloud Systems', level: 'NSQF Level 7', aliases: ['aws', 'amazon web services', 'azure', 'gcp', 'google cloud'] },
  { name: 'Node.js Backend Engineering', category: 'Backend & Systems', level: 'NSQF Level 7', aliases: ['node.js', 'nodejs', 'express.js', 'express js'] },
  { name: 'MongoDB & NoSQL Modeling', category: 'Database Systems', level: 'NSQF Level 6', aliases: ['mongodb', 'nosql', 'mongoose'] },
  { name: 'Java Application Development', category: 'Core Computer Science', level: 'NSQF Level 6', aliases: ['java '] },
  { name: 'C++ Systems Programming', category: 'Core Computer Science', level: 'NSQF Level 6', aliases: ['c++'] },
  { name: 'Machine Learning Fundamentals', category: 'Data & Systems', level: 'NSQF Level 7', aliases: ['machine learning', 'scikit-learn', 'ml model'] },
  { name: 'PyTorch Deep Learning', category: 'Data & Systems', level: 'NSQF Level 7', aliases: ['pytorch', 'deep learning', 'neural network'] },
  { name: 'LLM & Vector Embeddings', category: 'Data & Systems', level: 'NSQF Level 7', aliases: ['llm', 'large language model', 'vector embedding', 'rag pipeline'] },
  { name: 'System Design Fundamentals', category: 'Engineering Practices', level: 'NSQF Level 7', aliases: ['system design', 'distributed systems', 'load balancing'] },
  { name: 'Next.js / Server-Side Rendering', category: 'Software Development', level: 'NSQF Level 7', aliases: ['next.js', 'nextjs', 'server-side rendering', 'ssr'] }
];

function extractSkillsFromText(rawText) {
  const text = ` ${String(rawText || '').toLowerCase()} `;

  const found = SKILL_CATALOG.filter((skill) =>
    skill.aliases.some((alias) => text.includes(alias))
  );

  return found.map((skill) => ({
    name: skill.name,
    category: skill.category,
    level: skill.level,
    // Deterministic-ish pseudo-score so repeated extraction of the same
    // document doesn't wildly swing a candidate's readiness score.
    score: 78 + (skill.name.length % 15)
  }));
}

module.exports = { SKILL_CATALOG, extractSkillsFromText };
