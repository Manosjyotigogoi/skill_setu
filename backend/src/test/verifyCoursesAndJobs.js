require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('../models/Course');
const { discoverCoursesForGaps, matchJobToSkills } = require('../services/aiService');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const count = await Course.countDocuments({ free: true });
  console.log(`Total free courses: ${count}`);

  // Test provider distribution
  const providers = await Course.distinct('provider');
  console.log('Approved Providers in DB:', providers);

  // Test discovery for sample gap skills
  const testGaps = ['React.js', 'Python', 'Docker'];
  const { courses, recommendation } = await discoverCoursesForGaps(testGaps);
  console.log(`Discovered ${courses.length} courses for gaps: ${testGaps.join(', ')}`);
  courses.slice(0, 3).forEach((c) => {
    console.log(`- [${c.provider}] ${c.title} (${c.level}, ${c.duration}) -> ${c.url}`);
    console.log(`  Bridges: ${c.matchedGaps.join(', ')} | Free: ${c.freeStatus}`);
  });
  console.log('Recommendation:', recommendation);

  await mongoose.disconnect();
  console.log('Verification passed!');
}

test().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
