const express = require('express');
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(100),
    Notification.countDocuments({ recipient: req.user._id, readAt: null })
  ]);
  res.json({ notifications, unreadCount });
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, readAt: null },
    { readAt: new Date() }
  );
  res.json({ message: 'All notifications marked as read.' });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { readAt: new Date() },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification });
}));

module.exports = router;
