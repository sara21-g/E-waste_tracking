const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getCarbonHistory, getCarbonSummary, getRewards,
  redeemPoints, getLeaderboard, estimatePoints
} = require('../controllers/carbonController');

router.use(protect);

router.get('/history', getCarbonHistory);
router.get('/summary', getCarbonSummary);
router.get('/rewards', getRewards);
router.get('/leaderboard', getLeaderboard);
router.post('/estimate', estimatePoints);
router.post('/redeem', [
  body('rewardId').notEmpty().withMessage('Reward ID is required'),
  validate
], redeemPoints);

// Admin: manage rewards catalog
router.post('/rewards', authorize('admin'), async (req, res, next) => {
  try {
    const { Reward } = require('../models/index');
    const reward = await Reward.create(req.body);
    res.status(201).json({ success: true, data: reward });
  } catch (err) { next(err); }
});

router.put('/rewards/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { Reward } = require('../models/index');
    const reward = await Reward.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!reward) return res.status(404).json({ success: false, message: 'Reward not found' });
    res.status(200).json({ success: true, data: reward });
  } catch (err) { next(err); }
});

router.delete('/rewards/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { Reward } = require('../models/index');
    await Reward.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Reward deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
