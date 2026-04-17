const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Pickup = require('../models/Pickup');
const Recycler = require('../models/Recycler');
const NGO = require('../models/NGO');
const { CarbonCredit, WasteType } = require('../models/index');

router.use(protect, authorize('admin'));

// @desc  Platform dashboard overview
router.get('/dashboard', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers, newUsers,
      totalPickups, pendingPickups, completedPickups,
      totalRecyclers, pendingRecyclers,
      totalNGOs, pendingNGOs,
      carbonStats,
      pickupsByStatus,
      recentPickups,
      topUsers
    ] = await Promise.all([
      User.countDocuments({ role: 'household' }),
      User.countDocuments({ role: 'household', createdAt: { $gte: thirtyDaysAgo } }),
      Pickup.countDocuments(),
      Pickup.countDocuments({ status: 'pending' }),
      Pickup.countDocuments({ status: 'processed' }),
      Recycler.countDocuments({ isVerified: true }),
      Recycler.countDocuments({ verificationStatus: 'pending' }),
      NGO.countDocuments({ isVerified: true }),
      NGO.countDocuments({ verificationStatus: 'pending' }),
      CarbonCredit.aggregate([
        { $match: { transactionType: 'earned' } },
        { $group: { _id: null, totalPoints: { $sum: '$points' }, totalCarbon: { $sum: '$carbonReduced' } } }
      ]),
      Pickup.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Pickup.find().sort({ createdAt: -1 }).limit(5)
        .populate('user', 'name email')
        .populate('items.wasteType', 'name'),
      User.find({ role: 'household' }).sort({ carbonPoints: -1 }).limit(5)
        .select('name email carbonPoints totalCarbonReduced')
    ]);

    const statusMap = {};
    pickupsByStatus.forEach(s => { statusMap[s._id] = s.count; });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers, newUsers,
          totalPickups, pendingPickups, completedPickups,
          totalRecyclers, pendingRecyclers,
          totalNGOs, pendingNGOs
        },
        carbon: {
          totalPointsIssued: carbonStats[0]?.totalPoints || 0,
          totalCarbonReduced: carbonStats[0]?.totalCarbon || 0
        },
        pickupsByStatus: statusMap,
        recentPickups,
        topUsers
      }
    });
  } catch (err) { next(err); }
});

// @desc  Monthly pickup trends
router.get('/analytics/pickups', async (req, res, next) => {
  try {
    const { months = 6 } = req.query;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const trends = await Pickup.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'processed'] }, 1, 0] } },
          totalWeight: { $sum: '$totalActualWeight' },
          totalPoints: { $sum: '$carbonPointsAwarded' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({ success: true, data: trends });
  } catch (err) { next(err); }
});

// @desc  Waste category breakdown
router.get('/analytics/waste-categories', async (req, res, next) => {
  try {
    const breakdown = await Pickup.aggregate([
      { $match: { status: 'processed' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'wastetypes',
          localField: 'items.wasteType',
          foreignField: '_id',
          as: 'wasteTypeDetails'
        }
      },
      { $unwind: '$wasteTypeDetails' },
      {
        $group: {
          _id: '$wasteTypeDetails.category',
          totalWeight: { $sum: { $multiply: ['$items.actualWeight', '$items.quantity'] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalWeight: -1 } }
    ]);

    res.status(200).json({ success: true, data: breakdown });
  } catch (err) { next(err); }
});

// @desc  Geographic distribution
router.get('/analytics/geography', async (req, res, next) => {
  try {
    const cityData = await Pickup.aggregate([
      { $group: { _id: '$pickupAddress.city', total: { $sum: 1 }, weight: { $sum: '$totalActualWeight' } } },
      { $sort: { total: -1 } },
      { $limit: 20 }
    ]);
    res.status(200).json({ success: true, data: cityData });
  } catch (err) { next(err); }
});

// @desc  Manually assign pickup to recycler/NGO
router.patch('/pickups/:pickupId/assign', async (req, res, next) => {
  try {
    const { entityId, entityType } = req.body;
    if (!['Recycler', 'NGO'].includes(entityType)) {
      return res.status(400).json({ success: false, message: 'entityType must be Recycler or NGO' });
    }

    const pickup = await Pickup.findByIdAndUpdate(req.params.pickupId, {
      assignedTo: { entity: entityId, entityType },
      status: 'assigned',
      $push: { statusHistory: { status: 'assigned', note: 'Manually assigned by admin', updatedBy: req.user._id } }
    }, { new: true });

    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });
    res.status(200).json({ success: true, message: 'Pickup assigned', data: pickup });
  } catch (err) { next(err); }
});

// @desc  Seed waste types (initial setup)
router.post('/seed/waste-types', async (req, res, next) => {
  try {
    const defaultWasteTypes = [
      { name: 'Laptop', category: 'it_equipment', carbonEmissionFactor: 4.2, pointsPerKg: 15, avgWeightKg: 2.5, examples: ['MacBook', 'Dell', 'HP Laptop'], hazardLevel: 'medium' },
      { name: 'Desktop Computer', category: 'it_equipment', carbonEmissionFactor: 5.0, pointsPerKg: 12, avgWeightKg: 8, examples: ['PC Tower', 'iMac'], hazardLevel: 'medium' },
      { name: 'Mobile Phone', category: 'it_equipment', carbonEmissionFactor: 3.5, pointsPerKg: 20, avgWeightKg: 0.2, examples: ['iPhone', 'Android phone'], hazardLevel: 'high' },
      { name: 'Television', category: 'screens', carbonEmissionFactor: 2.8, pointsPerKg: 10, avgWeightKg: 15, examples: ['LED TV', 'OLED TV', 'CRT TV'], hazardLevel: 'medium' },
      { name: 'Monitor', category: 'screens', carbonEmissionFactor: 3.0, pointsPerKg: 10, avgWeightKg: 5, examples: ['LCD Monitor', 'Curved Monitor'], hazardLevel: 'medium' },
      { name: 'Refrigerator', category: 'large_appliances', carbonEmissionFactor: 2.5, pointsPerKg: 8, avgWeightKg: 60, examples: ['Single door', 'Double door fridge'], hazardLevel: 'medium' },
      { name: 'Washing Machine', category: 'large_appliances', carbonEmissionFactor: 2.2, pointsPerKg: 8, avgWeightKg: 55, examples: ['Front load', 'Top load'], hazardLevel: 'low' },
      { name: 'Printer', category: 'it_equipment', carbonEmissionFactor: 3.8, pointsPerKg: 12, avgWeightKg: 5, examples: ['Inkjet', 'Laser printer'], hazardLevel: 'medium' },
      { name: 'Battery', category: 'batteries', carbonEmissionFactor: 6.0, pointsPerKg: 25, avgWeightKg: 0.3, examples: ['Lithium-ion', 'Lead acid', 'AA/AAA'], hazardLevel: 'critical' },
      { name: 'Air Conditioner', category: 'large_appliances', carbonEmissionFactor: 3.5, pointsPerKg: 9, avgWeightKg: 35, examples: ['Split AC', 'Window AC'], hazardLevel: 'high' },
      { name: 'Microwave Oven', category: 'small_appliances', carbonEmissionFactor: 2.0, pointsPerKg: 10, avgWeightKg: 12, examples: ['Solo microwave', 'Convection oven'], hazardLevel: 'low' },
      { name: 'Tablet', category: 'it_equipment', carbonEmissionFactor: 3.5, pointsPerKg: 18, avgWeightKg: 0.5, examples: ['iPad', 'Android tablet'], hazardLevel: 'high' },
    ];

    await WasteType.deleteMany({});
    const types = await WasteType.insertMany(defaultWasteTypes);
    res.status(201).json({ success: true, message: `${types.length} waste types seeded`, data: types });
  } catch (err) { next(err); }
});

module.exports = router;
