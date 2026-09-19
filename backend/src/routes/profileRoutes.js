const express = require('express');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  getMyProfile,
  updateMyProfile,
  updateSettings,
  uploadMyAvatar,
  deleteMyAvatar
} = require('../controllers/profileController');

const router = express.Router();

router.use(protect);
router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);
router.patch('/settings', updateSettings);
router.post('/avatar', upload.single('avatar'), uploadMyAvatar);
router.delete('/avatar', deleteMyAvatar);

module.exports = router;
