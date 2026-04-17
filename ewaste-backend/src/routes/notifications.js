const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { Notification } = require('../models/index');

router.use(protect);

// @desc  Get all notifications for user
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const query = { user: req.user._id };
    if (unread === 'true') query.isRead = false;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: req.user._id, isRead: false })
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) { next(err); }
});

// @desc  Mark single notification as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.status(200).json({ success: true, data: notification });
  } catch (err) { next(err); }
});

// @desc  Mark all notifications as read
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

// @desc  Delete a notification
router.delete('/:id', async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) { next(err); }
});

// @desc  Clear all notifications
router.delete('/', async (req, res, next) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (err) { next(err); }
});

module.exports = router;
