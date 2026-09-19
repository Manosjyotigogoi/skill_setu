#!/usr/bin/env node
/**
 * Manually trigger the quarterly employment check-in cycle.
 *
 * Usage:
 *   node scripts/runCheckInCycle.js
 *
 * This is the same function that runs automatically on the 1st of Jan/May/Sep
 * when CHECK_IN_CRON_ENABLED=true. Use this script to test the flow in dev
 * or to manually run a cycle outside the normal schedule.
 */

require('dotenv').config();

const connectDB = require('../src/config/db');
const { runQuarterlyCheckInCycle } = require('../src/services/checkInScheduler');

async function main() {
  console.log('Connecting to database...');
  await connectDB();

  console.log('Starting quarterly check-in cycle...');
  const result = await runQuarterlyCheckInCycle();

  console.log('\n========================================');
  console.log('Quarterly Check-in Cycle Complete');
  console.log('========================================');
  console.log(`Cycle:              ${result.cycle}`);
  console.log(`Total candidates:   ${result.totalCandidates}`);
  console.log(`Check-ins created:  ${result.created}`);
  console.log(`Already had cycle:  ${result.skipped}`);
  console.log(`Emails dispatched:  ${result.emailed}`);
  if (result.errors.length > 0) {
    console.log(`Errors:             ${result.errors.length}`);
    result.errors.forEach((e) => console.log(`  - ${e.user}: ${e.error}`));
  }
  console.log('========================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
