const { Notification } = require('../models/index');

exports.create = async ({ user, title, message, type, data, link }) => {
  try {
    return await Notification.create({ user, title, message, type, data, link });
  } catch (err) {
    // Notification failure should never crash business logic
    console.error('Notification creation failed:', err.message);
  }
};

exports.getUnread = async (userId) => {
  return Notification.find({ user: userId, isRead: false }).sort({ createdAt: -1 }).limit(50);
};

exports.markAllRead = async (userId) => {
  return Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
};
