const express = require('express');
const { protect } = require('../middleware/auth');
const { getMyProfile, updateMyProfile, updateSettings } = require('../controllers/profileController');

const router = express.Router();

router.use(protect);
router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);
router.patch('/settings', updateSettings);

module.exports = router;
