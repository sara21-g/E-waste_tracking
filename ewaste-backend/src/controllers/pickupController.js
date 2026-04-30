const Pickup = require('../models/Pickup');
const User = require('../models/User');
const Recycler = require('../models/Recycler');
const NGO = require('../models/NGO');
const { CarbonCredit, Notification } = require('../models/index');
const carbonService = require('../services/carbonService');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const blockchainService = require('../blockchain/blockchainService');

// @desc    Schedule a new pickup
// @route   POST /api/pickups
exports.schedulePickup = async (req, res, next) => {
  try {
    const { items, scheduledDate, timeSlot, pickupAddress, specialInstructions } = req.body;

    // Validate scheduled date is in future
    if (new Date(scheduledDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Scheduled date must be in the future' });
    }

    // Check for conflicting pickups on same day
    const startOfDay = new Date(scheduledDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(scheduledDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingPickup = await Pickup.findOne({
      user: req.user._id,
      scheduledDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled', 'processed'] }
    });

    if (existingPickup) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pickup scheduled for this date'
      });
    }

    const pickup = await Pickup.create({
      user: req.user._id,
      items,
      scheduledDate,
      timeSlot,
      pickupAddress: pickupAddress || req.user.address,
      specialInstructions,
      statusHistory: [{ status: 'pending', note: 'Pickup request submitted', updatedBy: req.user._id }]
    });

    await pickup.populate('items.wasteType', 'name category pointsPerKg carbonEmissionFactor');

    // Notify user
    await notificationService.create({
      user: req.user._id,
      title: 'Pickup Scheduled!',
      message: `Your e-waste pickup (${pickup.pickupId}) is scheduled for ${new Date(scheduledDate).toDateString()}.`,
      type: 'pickup_scheduled',
      data: { pickupId: pickup._id }
    });

    // Auto-assign to nearest recycler/NGO (background process)
    assignPickupToNearestPartner(pickup);

    res.status(201).json({
      success: true,
      message: 'Pickup scheduled successfully',
      data: pickup
    });
  } catch (err) {
    next(err);
  }
};

// Background: auto-assign pickup
const assignPickupToNearestPartner = async (pickup) => {
  try {
    const city = pickup.pickupAddress?.city;
    if (!city) return;

    const recycler = await Recycler.findOne({
      isVerified: true,
      isActive: true,
      'serviceAreas.city': new RegExp(city, 'i')
    });

    if (recycler) {
      pickup.assignedTo = { entity: recycler._id, entityType: 'Recycler' };
      pickup.status = 'assigned';
      pickup.statusHistory.push({ status: 'assigned', note: 'Auto-assigned to recycler' });
      await pickup.save();

      await notificationService.create({
        user: pickup.user,
        title: 'Pickup Assigned!',
        message: 'A certified recycler has been assigned to your pickup.',
        type: 'pickup_assigned',
        data: { pickupId: pickup._id }
      });
    }
  } catch (err) {
    // silent fail - can retry later
  }
};

// @desc    Get all pickups (user's own)
// @route   GET /api/pickups
exports.getUserPickups = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { user: req.user._id };
    if (status) query.status = status;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'items.wasteType', select: 'name category icon' },
        { path: 'assignedTo.entity', select: 'organizationName rating logo' }
      ]
    };

    const result = await Pickup.paginate(query, options);

    res.status(200).json({
      success: true,
      data: result.docs,
      pagination: {
        total: result.totalDocs,
        page: result.page,
        pages: result.totalPages,
        limit: result.limit
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single pickup
// @route   GET /api/pickups/:id
exports.getPickup = async (req, res, next) => {
  try {
    const pickup = await Pickup.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.wasteType', 'name category icon hazardLevel')
      .populate('assignedTo.entity', 'organizationName rating phone logo serviceAreas');

    if (!pickup) {
      return res.status(404).json({ success: false, message: 'Pickup not found' });
    }

    // Access control
    const isOwner = pickup.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssigned = pickup.assignedTo?.entity?._id?.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this pickup' });
    }

    res.status(200).json({ success: true, data: pickup });
  } catch (err) {
    next(err);
  }
};

// @desc    Update pickup status (recycler/ngo/admin)
// @route   PATCH /api/pickups/:id/status
exports.updatePickupStatus = async (req, res, next) => {
  try {
    const { status, note, actualWeights } = req.body;
    const allowedStatuses = ['confirmed', 'in_transit', 'collected', 'processed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const pickup = await Pickup.findById(req.params.id).populate('items.wasteType');

    if (!pickup) {
      return res.status(404).json({ success: false, message: 'Pickup not found' });
    }

    // Update actual weights if provided (at collection time)
    if (actualWeights && status === 'collected') {
      actualWeights.forEach(({ itemIndex, weight }) => {
        if (pickup.items[itemIndex]) {
          pickup.items[itemIndex].actualWeight = weight;
        }
      });
      pickup.totalActualWeight = pickup.items.reduce((sum, item) => {
        return sum + (item.actualWeight || 0) * (item.quantity || 1);
      }, 0);
    }

    pickup.status = status;
    pickup.statusHistory.push({ status, note: note || `Status updated to ${status}`, updatedBy: req.user._id });

    if (status === 'collected') pickup.completedAt = new Date();

    // Award carbon points when processed
    if (status === 'processed') {
      const { points, carbonReduced } = await carbonService.calculateAndAwardPoints(pickup);
      pickup.carbonPointsAwarded = points;
      pickup.carbonReduced = carbonReduced;

      // Update user stats
      await User.findByIdAndUpdate(pickup.user, {
        $inc: {
          carbonPoints: points,
          totalCarbonReduced: carbonReduced,
          totalEwasteDisposed: pickup.totalActualWeight || pickup.totalEstimatedWeight
        }
      });

      // Create carbon credit transaction
      const user = await User.findById(pickup.user);
      await CarbonCredit.create({
        user: pickup.user,
        pickup: pickup._id,
        transactionType: 'earned',
        points,
        carbonReduced,
        description: `Carbon points earned from pickup ${pickup.pickupId}`,
        balanceAfter: user.carbonPoints + points
      });

      // Generate certificate
      pickup.certificateGenerated = true;

      await notificationService.create({
        user: pickup.user,
        title: '🎉 Pickup Completed!',
        message: `You earned ${points} carbon points and reduced ${carbonReduced.toFixed(2)} kg CO₂. Certificate ready!`,
        type: 'points_earned',
        data: { pickupId: pickup._id, points, carbonReduced }
      });

      // Award points on blockchain
      blockchainService.awardUserPoints(pickup.user.toString(), points, carbonReduced);
    }

    if (status === 'cancelled') {
      pickup.cancellationReason = note;
    }

    await pickup.save();

    res.status(200).json({
      success: true,
      message: `Pickup status updated to ${status}`,
      data: pickup
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel pickup (user)
// @route   DELETE /api/pickups/:id
exports.cancelPickup = async (req, res, next) => {
  try {
    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) {
      return res.status(404).json({ success: false, message: 'Pickup not found' });
    }

    if (pickup.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (['collected', 'processed'].includes(pickup.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed pickup' });
    }

    pickup.status = 'cancelled';
    pickup.cancellationReason = req.body.reason || 'Cancelled by user';
    pickup.statusHistory.push({
      status: 'cancelled',
      note: pickup.cancellationReason,
      updatedBy: req.user._id
    });
    await pickup.save();

    res.status(200).json({ success: true, message: 'Pickup cancelled successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc    Rate a completed pickup
// @route   POST /api/pickups/:id/rate
exports.ratePickup = async (req, res, next) => {
  try {
    const { rating, feedback } = req.body;
    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });
    if (pickup.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (pickup.status !== 'processed') {
      return res.status(400).json({ success: false, message: 'Only completed pickups can be rated' });
    }
    if (pickup.userRating) {
      return res.status(400).json({ success: false, message: 'Already rated' });
    }

    pickup.userRating = rating;
    pickup.userFeedback = feedback;
    await pickup.save();

    // Update recycler/NGO rating
    if (pickup.assignedTo?.entity) {
      const Model = pickup.assignedTo.entityType === 'Recycler' ? Recycler : NGO;
      await Model.findByIdAndUpdate(pickup.assignedTo.entity, {
        $inc: { rating, ratingCount: 1 }
      });
    }

    res.status(200).json({ success: true, message: 'Rating submitted. Thank you!' });
  } catch (err) {
    next(err);
  }
};

// @desc    Get pickup OTP for verification at collection
// @route   GET /api/pickups/:id/otp
exports.getPickupOTP = async (req, res, next) => {
  try {
    const pickup = await Pickup.findById(req.params.id);
    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });
    if (pickup.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pickup.otp = otp;
    pickup.otpExpire = Date.now() + 30 * 60 * 1000; // 30 min
    await pickup.save();

    // In production: send OTP via SMS/email
    res.status(200).json({
      success: true,
      message: 'OTP generated',
      data: { otp } // In production, don't return this — send via SMS
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify OTP during collection
// @route   POST /api/pickups/:id/verify-otp
exports.verifyPickupOTP = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const pickup = await Pickup.findById(req.params.id);

    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });
    if (!pickup.otp || pickup.otpExpire < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }
    if (pickup.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    pickup.otp = undefined;
    pickup.otpExpire = undefined;
    await pickup.save();

    res.status(200).json({ success: true, message: 'OTP verified. Pickup handover confirmed.' });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin: get all pickups
// @route   GET /api/pickups/admin/all
exports.getAllPickups = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, city, from, to } = req.query;
    const query = {};
    if (status) query.status = status;
    if (city) query['pickupAddress.city'] = new RegExp(city, 'i');
    if (from || to) {
      query.scheduledDate = {};
      if (from) query.scheduledDate.$gte = new Date(from);
      if (to) query.scheduledDate.$lte = new Date(to);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: [
        { path: 'user', select: 'name email' },
        { path: 'items.wasteType', select: 'name' }
      ]
    };

    const result = await Pickup.paginate(query, options);

    res.status(200).json({
      success: true,
      data: result.docs,
      pagination: { total: result.totalDocs, page: result.page, pages: result.totalPages }
    });
  } catch (err) {
    next(err);
  }
};
