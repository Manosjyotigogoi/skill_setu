require('dotenv').config();

const connectDB = require('./src/config/db');
const createApp = require('./src/app');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`Skill-Setu backend listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);

      // Auto-schedule the quarterly employment check-in cycle if enabled.
      // Set CHECK_IN_CRON_ENABLED=true in .env to activate.
      try {
        const { scheduleAutoCheckIn } = require('./src/services/checkInScheduler');
        scheduleAutoCheckIn();
      } catch (err) {
        console.warn('Check-in auto-schedule skipped:', err.message);
      }

      // Auto-seed free learning resources if courses collection is empty
      try {
        const Course = require('./src/models/Course');
        Course.countDocuments().then(async (count) => {
          if (count === 0) {
            const { freeCoursesCatalog } = require('./src/seed/seedFreeCourses');
            const inserted = await Course.insertMany(freeCoursesCatalog);
            console.log(`Auto-seeded ${inserted.length} free courses into MongoDB.`);
          }
        }).catch((err) => console.warn('Course count check error:', err.message));
      } catch (err) {
        console.warn('Course auto-seed error:', err.message);
      }
    });

  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
