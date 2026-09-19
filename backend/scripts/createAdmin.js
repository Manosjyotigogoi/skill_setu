// Usage:
//   npm run create-admin -- --name "Placement Officer" --email admin@nit.edu.in --password "SomeStrongPassword123"
//
// Admin accounts are never created through the public /api/auth/register
// endpoint — this mirrors the "promoted via direct DB modification" pattern
// used in the Quad project. Run this script whenever a new TPO/admin needs
// portal access.

require('dotenv').config();

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const { generateSkillSetuId } = require('../src/utils/ids');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach((arg, i, arr) => {
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true;
      args[key] = value;
    }
  });
  return args;
}

async function run() {
  const { name, email, password } = parseArgs();

  if (!name || !email || !password) {
    console.error('Usage: npm run create-admin -- --name "..." --email "..." --password "..."');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`A user with email ${email} already exists.`);
    process.exit(1);
  }

  const admin = new User({
    name,
    email: email.toLowerCase(),
    role: 'admin',
    sovereignStatus: 'VERIFIED_LINKED',
    skillSetuId: generateSkillSetuId()
  });
  await admin.setPassword(password);
  await admin.save();

  console.log(`Admin account created: ${admin.email} (id: ${admin._id})`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});
