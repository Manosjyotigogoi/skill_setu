const express = require('express');
const { protect } = require('../middleware/auth');
const { getDrives, getDriveById, applyToDrive } = require('../controllers/driveController');

const router = express.Router();

router.use(protect);
router.get('/', getDrives);
router.get('/:id', getDriveById);
router.post('/:id/apply', applyToDrive);

module.exports = router;
