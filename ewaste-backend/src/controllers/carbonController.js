const { CarbonCredit, Reward } = require('../models/index');
const User = require('../models/User');
const carbonService = require('../services/carbonService');
const blockchainService = require('../blockchain/blockchainService');

// @desc    Get user's carbon credit history
// @route   GET /api/carbon/history
exports.getCarbonHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const query = { user: req.user._id };
    if (type) query.transactionType = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      CarbonCredit.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('pickup', 'pickupId scheduledDate totalActualWeight'),
      CarbonCredit.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user's carbon summary/dashboard
// @route   GET /api/carbon/summary
exports.getCarbonSummary = async (req, res, next) => {
  try {
    const user = req.user;

    const [earned, redeemed, thisMonth] = await Promise.all([
      CarbonCredit.aggregate([
        { $match: { user: user._id, transactionType: 'earned' } },
        { $group: { _id: null, total: { $sum: '$points' }, carbonReduced: { $sum: '$carbonReduced' } } }
      ]),
      CarbonCredit.aggregate([
        { $match: { user: user._id, transactionType: 'redeemed' } },
        { $group: { _id: null, total: { $sum: '$points' } } }
      ]),
      CarbonCredit.aggregate([
        {
          $match: {
            user: user._id,
            transactionType: 'earned',
            createdAt: { $gte: new Date(new Date().setDate(1)) }
          }
        },
        { $group: { _id: null, total: { $sum: '$points' }, carbonReduced: { $sum: '$carbonReduced' } } }
      ])
    ]);

    const totalEarned = earned[0]?.total || 0;
    const totalRedeemed = redeemed[0]?.total || 0;
    const carbonReduced = earned[0]?.carbonReduced || 0;

    res.status(200).json({
      success: true,
      data: {
        currentBalance: user.carbonPoints,
        totalEarned,
        totalRedeemed,
        totalCarbonReduced: carbonReduced,
        thisMonthPoints: thisMonth[0]?.total || 0,
        thisMonthCarbon: thisMonth[0]?.carbonReduced || 0,
        treesEquivalent: carbonService.carbonToTrees(carbonReduced),
        kmsNotDriven: carbonService.carbonToKmNotDriven(carbonReduced),
        totalEwasteDisposed: user.totalEwasteDisposed,
        level: carbonService.getUserLevel(user.carbonPoints),
        nextLevelPoints: carbonService.nextLevelPoints(user.carbonPoints)
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get available rewards
// @route   GET /api/carbon/rewards
exports.getRewards = async (req, res, next) => {
  try {
    const rewards = await Reward.find({
      isActive: true,
      $or: [{ validUntil: { $gt: new Date() } }, { validUntil: null }],
      $or: [{ stockAvailable: -1 }, { stockAvailable: { $gt: 0 } }]
    }).sort({ pointsRequired: 1 });

    res.status(200).json({ success: true, data: rewards });
  } catch (err) {
    next(err);
  }
};

// @desc    Redeem points for a reward
// @route   POST /api/carbon/redeem
exports.redeemPoints = async (req, res, next) => {
  try {
    const { rewardId } = req.body;

    const reward = await Reward.findById(rewardId);
    if (!reward || !reward.isActive) {
      return res.status(404).json({ success: false, message: 'Reward not found or unavailable' });
    }

    const user = await User.findById(req.user._id);
    if (user.carbonPoints < reward.pointsRequired) {
      return res.status(400).json({
        success: false,
        message: `Insufficient points. You need ${reward.pointsRequired - user.carbonPoints} more points.`
      });
    }

    if (reward.stockAvailable !== -1 && reward.stockAvailable <= 0) {
      return res.status(400).json({ success: false, message: 'Reward out of stock' });
    }

    // Deduct points
    user.carbonPoints -= reward.pointsRequired;
    await user.save({ validateBeforeSave: false });

    // Generate reward code
    const { v4: uuidv4 } = require('uuid');
    const rewardCode = `RW-${uuidv4().substring(0, 8).toUpperCase()}`;

    const transaction = await CarbonCredit.create({
      user: user._id,
      transactionType: 'redeemed',
      points: -reward.pointsRequired,
      description: `Redeemed: ${reward.title}`,
      balanceAfter: user.carbonPoints,
      redeemDetails: {
        rewardType: reward.rewardType,
        rewardCode,
        rewardValue: reward.monetaryValue
      }
    });

    if (reward.stockAvailable !== -1) {
      reward.stockAvailable -= 1;
    }
    reward.redemptionCount += 1;
    await reward.save();

    // Redeem points on blockchain
    blockchainService.redeemUserPoints(user._id.toString(), reward.pointsRequired);


    res.status(200).json({
      success: true,
      message: 'Points redeemed successfully!',
      data: {
        rewardCode,
        reward: reward.title,
        pointsDeducted: reward.pointsRequired,
        remainingBalance: user.carbonPoints,
        expiresAt: reward.validUntil
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get leaderboard
// @route   GET /api/carbon/leaderboard
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { limit = 10, period } = req.query;

    let matchStage = { transactionType: 'earned' };
    if (period === 'monthly') {
      matchStage.createdAt = { $gte: new Date(new Date().setDate(1)) };
    } else if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchStage.createdAt = { $gte: weekAgo };
    }

    const leaderboard = await CarbonCredit.aggregate([
      { $match: matchStage },
      { $group: { _id: '$user', totalPoints: { $sum: '$points' }, totalCarbon: { $sum: '$carbonReduced' } } },
      { $sort: { totalPoints: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          profileImage: '$user.profileImage',
          totalPoints: 1,
          totalCarbon: 1
        }
      }
    ]);

    // Add rank
    const ranked = leaderboard.map((item, index) => ({ ...item, rank: index + 1 }));

    res.status(200).json({ success: true, data: ranked });
  } catch (err) {
    next(err);
  }
};

// @desc    Calculate potential points before scheduling
// @route   POST /api/carbon/estimate
exports.estimatePoints = async (req, res, next) => {
  try {
    const { items } = req.body; // [{ wasteTypeId, quantity, estimatedWeight }]
    const result = await carbonService.estimatePoints(items);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
