// Quarterly (every 4 months) employment check-in scheduler.
//
// This module exposes a `runQuarterlyCheckInCycle()` function that:
//   1. Computes the current cycle label (e.g. "Q3-2026")
//   2. Finds all students/trainees
//   3. For each, creates an EmploymentCheckIn record (if not already created
//      for this cycle)
//   4. Sends them the check-in email
//
// In dev, the email is rendered to the console (see emailService.js).
//
// Triggering:
//   - Manual:  `node scripts/runCheckInCycle.js`
//   - Scheduled:  set CHECK_IN_CRON_ENABLED=true in .env and the server will
//      run the cycle automatically on the 1st of Jan, May, and September at 09:00 IST.

const User = require('../models/User');
const EmploymentCheckIn = require('../models/EmploymentCheckIn');
const { sendEmail, buildCheckInEmailHtml } = require('./emailService');

function getCurrentCycle() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 4=May, 8=Sep
  const year = now.getFullYear();

  // Map the month to a cycle quarter (4-month cycle)
  // Jan-Apr = Q1, May-Aug = Q2, Sep-Dec = Q3
  let quarter;
  if (month <= 3) quarter = 'Q1';
  else if (month <= 7) quarter = 'Q2';
  else quarter = 'Q3';

  return `${quarter}-${year}`;
}

async function runQuarterlyCheckInCycle() {
  const cycle = getCurrentCycle();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Find all students and trainees (not admins)
  const candidates = await User.find({ role: { $in: ['student', 'trainee'] } });

  let created = 0;
  let skipped = 0;
  let emailed = 0;
  const errors = [];

  for (const candidate of candidates) {
    try {
      // Check if a check-in record already exists for this user + cycle
      const existing = await EmploymentCheckIn.findOne({
        user: candidate._id,
        cycle
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      // Create the check-in record
      const checkIn = await EmploymentCheckIn.create({
        user: candidate._id,
        cycle,
        emailSentAt: new Date(),
        currentEmploymentStatus: null,
        wantsReferral: false
      });

      // Send the email
      const checkInUrl = `${frontendUrl}/#/check-in/${checkIn._id}`;
      const html = buildCheckInEmailHtml(candidate.name, cycle, checkInUrl);

      if (candidate.email) {
        await sendEmail({
          to: candidate.email,
          subject: `Skill-Setu Quarterly Check-in (${cycle}) — Update Your Employment Status`,
          html,
          text: `Hello ${candidate.name}, please update your employment status at: ${checkInUrl}`
        });
        emailed += 1;
      }

      created += 1;
    } catch (err) {
      errors.push({ user: candidate._id, error: err.message });
    }
  }

  return {
    cycle,
    totalCandidates: candidates.length,
    created,
    skipped,
    emailed,
    errors
  };
}

// Auto-schedule via node-cron if enabled with interval support
function scheduleAutoCheckIn(intervalSetting = 'quarterly') {
  if (process.env.CHECK_IN_CRON_ENABLED !== 'true') {
    return null;
  }

  try {
    const cron = require('node-cron');
    let cronPattern = '0 9 1 1,5,9 *'; // quarterly default

    if (intervalSetting === 'weekly') {
      cronPattern = '0 9 * * 1'; // Every Monday at 09:00
    } else if (intervalSetting === 'monthly') {
      cronPattern = '0 9 1 * *'; // 1st of every month at 09:00
    }

    const task = cron.schedule(cronPattern, async () => {
      console.log(`\n📅 Running automated (${intervalSetting}) check-in cycle...`);
      try {
        const result = await runQuarterlyCheckInCycle();
        console.log(`✅ Check-in cycle complete:`, result);
      } catch (err) {
        console.error('❌ Scheduled check-in failed:', err.message);
      }
    });
    console.log(`📅 Automated check-in cron scheduled (${intervalSetting}: ${cronPattern})`);
    return task;
  } catch (err) {
    console.warn('⚠️ node-cron not installed — auto-scheduling disabled.');
    return null;
  }
}

module.exports = {
  getCurrentCycle,
  runQuarterlyCheckInCycle,
  scheduleAutoCheckIn
};
