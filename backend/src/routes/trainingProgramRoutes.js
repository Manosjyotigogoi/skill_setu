const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  listPrograms,
  getProgram,
  createProgram,
  enrollInProgram,
  runAiAnalysis
} = require('../controllers/trainingProgramController');

// Student/trainee endpoints
router.get('/', protect, listPrograms);
router.get('/:id', protect, restrictTo('admin', 'government_admin'), getProgram);
router.post('/:id/enroll', protect, enrollInProgram);

// Admin-only endpoints
router.post('/', protect, restrictTo('admin', 'government_admin'), createProgram);
router.post('/:id/ai-analysis', protect, restrictTo('admin', 'government_admin'), runAiAnalysis);

module.exports = router;
