const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const skillRoutes = require('./routes/skillRoutes');
const targetRoleRoutes = require('./routes/targetRoleRoutes');
const courseRoutes = require('./routes/courseRoutes');
const driveRoutes = require('./routes/driveRoutes');
const documentRoutes = require('./routes/documentRoutes');
const dossierRoutes = require('./routes/dossierRoutes');
const adminRoutes = require('./routes/adminRoutes');
const trainingProgramRoutes = require('./routes/trainingProgramRoutes');
const checkInRoutes = require('./routes/checkInRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { UPLOAD_DIR } = require('./middleware/upload');

function createApp() {
  const app = express();

  app.use('/uploads', express.static(UPLOAD_DIR));

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'skill-setu-backend', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/skills', skillRoutes);
  app.use('/api/roles', targetRoleRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/drives', driveRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/dossier', dossierRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/training-programs', trainingProgramRoutes);
  app.use('/api/check-ins', checkInRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
