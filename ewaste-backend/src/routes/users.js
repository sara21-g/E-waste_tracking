const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const User = require('../models/User');

router.use(protect);

// @desc  Get user profile
router.get('/profile', async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('pickups', 'pickupId status scheduledDate carbonPointsAwarded');
  res.status(200).json({ success: true, data: user });
});

// @desc  Update profile
router.put('/profile', [
  body('name').optional().trim().notEmpty(),
  body('phone').optional().isMobilePhone(),
  validate
], async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'address', 'notificationPreferences'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Profile updated', data: user });
  } catch (err) { next(err); }
});

// @desc  Upload profile image
router.put('/profile/image', upload.single('profileImage'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user._id, { profileImage: imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'Profile image updated', data: { profileImage: user.profileImage } });
  } catch (err) { next(err); }
});

// @desc  Change password
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate
], async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = req.body.newPassword;
    user.refreshToken = undefined;
    await user.save();
    res.status(200).json({ success: true, message: 'Password changed successfully. Please login again.' });
  } catch (err) { next(err); }
});

// @desc  Get user stats
router.get('/stats', async (req, res, next) => {
  try {
    const Pickup = require('../models/Pickup');
    const { CarbonCredit } = require('../models/index');
    const carbonService = require('../services/carbonService');

    const [pickupStats, user] = await Promise.all([
      Pickup.aggregate([
        { $match: { user: req.user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      User.findById(req.user._id)
    ]);

    const statusMap = {};
    pickupStats.forEach(s => { statusMap[s._id] = s.count; });

    res.status(200).json({
      success: true,
      data: {
        carbonPoints: user.carbonPoints,
        totalCarbonReduced: user.totalCarbonReduced,
        totalEwasteDisposed: user.totalEwasteDisposed,
        level: carbonService.getUserLevel(user.carbonPoints),
        nextLevelPoints: carbonService.nextLevelPoints(user.carbonPoints),
        treesEquivalent: carbonService.carbonToTrees(user.totalCarbonReduced),
        pickups: {
          total: Object.values(statusMap).reduce((a, b) => a + b, 0),
          ...statusMap
        }
      }
    });
  } catch (err) { next(err); }
});

// @desc  Deactivate account
router.delete('/account', async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false, refreshToken: undefined });
    res.status(200).json({ success: true, message: 'Account deactivated successfully' });
  } catch (err) { next(err); }
});

// Admin only
router.get('/', authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) { next(err); }
});

module.exports = router;
