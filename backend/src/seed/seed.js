require('dotenv').config();

const connectDB = require('../config/db');
const TargetRole = require('../models/TargetRole');
const Course = require('../models/Course');
const Drive = require('../models/Drive');
const TrainingProgram = require('../models/TrainingProgram');

const targetRoles = [
  {
    title: 'Senior Full-Stack / Frontend Engineer',
    tier: 'Tier-1 Enterprise / MNC',
    targetReadiness: 88,
    requiredSkills: [
      { name: 'React.js', requiredScore: 80 },
      { name: 'TypeScript', requiredScore: 75 },
      { name: 'REST APIs', requiredScore: 75 },
      { name: 'Next.js / SSR', requiredScore: 70 },
      { name: 'System Design', requiredScore: 70 },
      { name: 'Docker', requiredScore: 65 }
    ]
  },
  {
    title: 'Cloud Native & DevOps Engineer',
    tier: 'Tier-1 Cloud Provider',
    targetReadiness: 90,
    requiredSkills: [
      { name: 'Python', requiredScore: 75 },
      { name: 'Git', requiredScore: 70 },
      { name: 'SQL', requiredScore: 65 },
      { name: 'Kubernetes', requiredScore: 70 },
      { name: 'AWS', requiredScore: 70 }
    ]
  },
  {
    title: 'AI & Neural Applications Engineer',
    tier: 'GovTech / DeepTech R&D',
    targetReadiness: 92,
    requiredSkills: [
      { name: 'Python', requiredScore: 80 },
      { name: 'Data Structures', requiredScore: 80 },
      { name: 'LLM', requiredScore: 65 },
      { name: 'PyTorch', requiredScore: 65 }
    ]
  }
];

const { freeCoursesCatalog: courses } = require('./seedFreeCourses');


const drives = [
  {
    company: 'Tata Consultancy Services (TCS Digital)',
    logoInitials: 'TCS',
    role: 'Digital Specialist Software Engineer',
    location: 'Bengaluru / Hyderabad / Pune',
    ctcMinLpa: 9.2,
    ctcMaxLpa: 12.0,
    eligibilityCgpa: 7.5,
    deadline: new Date('2026-09-18'),
    driveDate: new Date('2026-09-22'),
    rounds: 'Proctored Coding + Tech Interview + HR',
    requiredSkills: ['React.js', 'Data Structures', 'Python', 'REST APIs', 'SQL']
  },
  {
    company: 'Tata Elxsi AI Labs',
    logoInitials: 'TEX',
    role: 'Autonomous Systems & Frontend Specialist',
    location: 'Bengaluru / Trivandrum',
    ctcMinLpa: 11.5,
    ctcMaxLpa: 14.5,
    eligibilityCgpa: 8.0,
    deadline: new Date('2026-09-20'),
    driveDate: new Date('2026-09-25'),
    rounds: 'AI Hackathon + Deep Architecture Review',
    requiredSkills: ['React.js', 'TypeScript', 'Python', 'Data Structures', 'Docker']
  },
  {
    company: 'Microsoft India Development Center (IDC)',
    logoInitials: 'MSFT',
    role: 'Software Development Engineer - I (Web & Cloud)',
    location: 'Hyderabad / Noida',
    ctcMinLpa: 24.0,
    ctcMaxLpa: 32.0,
    eligibilityCgpa: 8.5,
    deadline: new Date('2026-09-25'),
    driveDate: new Date('2026-10-02'),
    rounds: 'Online Assessment + 3 Technical Rounds',
    requiredSkills: ['Data Structures', 'React.js', 'TypeScript', 'Git', 'System Design']
  },
  {
    company: 'Infosys Topgear / Springboard',
    logoInitials: 'INFY',
    role: 'Specialist Programmer (SP Track)',
    location: 'Bengaluru / Mysuru / Chennai',
    ctcMinLpa: 9.5,
    ctcMaxLpa: 11.0,
    eligibilityCgpa: 7.0,
    deadline: new Date('2026-09-15'),
    driveDate: new Date('2026-09-19'),
    rounds: 'HackWithInfy Fast Track Interview',
    requiredSkills: ['Data Structures', 'React.js', 'Python', 'SQL', 'Git']
  }
];

const trainingPrograms = [
  {
    title: 'AICTE Cloud Native & DevOps Fast-Track',
    programCode: 'CLOUD-DEVOPS-01',
    provider: 'AICTE + NPTEL',
    description: 'An 8-week intensive program covering Docker, Kubernetes, CI/CD pipelines, and cloud deployment patterns aligned with NSQF Level 7.',
    durationWeeks: 8,
    taughtSkills: [
      { name: 'Docker', nsqfLevel: 'Level 7' },
      { name: 'Kubernetes', nsqfLevel: 'Level 7' },
      { name: 'AWS', nsqfLevel: 'Level 7' },
      { name: 'Git', nsqfLevel: 'Level 6' }
    ],
    techFocusAreas: ['Cloud Native', 'DevOps', 'Containerization', 'Infrastructure as Code'],
    status: 'ACTIVE'
  },
  {
    title: 'FutureSkills Prime: AI/ML & LLM Applications',
    programCode: 'AI-ML-LLM-02',
    provider: 'MeitY + NASSCOM',
    description: 'A 12-week deep-dive into production AI/ML systems, covering PyTorch, vector databases, LLM orchestration, and deployment patterns.',
    durationWeeks: 12,
    taughtSkills: [
      { name: 'Python', nsqfLevel: 'Level 7' },
      { name: 'PyTorch', nsqfLevel: 'Level 7' },
      { name: 'LLM', nsqfLevel: 'Level 7' },
      { name: 'Data Structures', nsqfLevel: 'Level 6' }
    ],
    techFocusAreas: ['AI/ML', 'Large Language Models', 'Vector Databases', 'MLOps'],
    status: 'ACTIVE'
  },
  {
    title: 'SWAYAM Full-Stack Web Development Bootcamp',
    programCode: 'FULLSTACK-WEB-03',
    provider: 'IIT Bombay + SWAYAM',
    description: 'A 10-week program covering modern frontend (React, Next.js), backend (Node.js, REST APIs), and database design.',
    durationWeeks: 10,
    taughtSkills: [
      { name: 'React.js', nsqfLevel: 'Level 7' },
      { name: 'TypeScript', nsqfLevel: 'Level 7' },
      { name: 'REST APIs', nsqfLevel: 'Level 7' },
      { name: 'SQL', nsqfLevel: 'Level 6' },
      { name: 'Next.js / SSR', nsqfLevel: 'Level 7' }
    ],
    techFocusAreas: ['Web Development', 'Server-Side Rendering', 'Type Safety', 'API Design'],
    status: 'ACTIVE'
  },
  {
    title: 'PMKVY Cybersecurity & Ethical Hacking Track',
    programCode: 'CYBER-SEC-04',
    provider: 'PMKVY + MSDE',
    description: 'A 6-week program covering network security, penetration testing, and security operations center (SOC) fundamentals.',
    durationWeeks: 6,
    taughtSkills: [
      { name: 'Network Security', nsqfLevel: 'Level 6' },
      { name: 'Penetration Testing', nsqfLevel: 'Level 7' },
      { name: 'Python', nsqfLevel: 'Level 6' },
      { name: 'Git', nsqfLevel: 'Level 6' }
    ],
    techFocusAreas: ['Cybersecurity', 'Zero Trust Architecture', 'Security Automation', 'SOC Operations'],
    status: 'ACTIVE'
  }
];

async function seed() {
  await connectDB();

  await TargetRole.deleteMany({});
  await TargetRole.insertMany(targetRoles);
  console.log(`Seeded ${targetRoles.length} target roles.`);

  await Course.deleteMany({});
  await Course.insertMany(courses);
  console.log(`Seeded ${courses.length} courses.`);

  await Drive.deleteMany({});
  await Drive.insertMany(drives);
  console.log(`Seeded ${drives.length} campus drives.`);

  await TrainingProgram.deleteMany({});
  await TrainingProgram.insertMany(trainingPrograms);
  console.log(`Seeded ${trainingPrograms.length} training programs.`);

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
