const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const Recycler = require('../models/Recycler');
const Pickup = require('../models/Pickup');

// @desc  Register as recycler
router.post('/register', protect, authorize('recycler'), [
  body('organizationName').trim().notEmpty().withMessage('Organization name is required'),
  body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
  validate
], async (req, res, next) => {
  try {
    const exists = await Recycler.findOne({ user: req.user._id });
    if (exists) return res.status(400).json({ success: false, message: 'Recycler profile already exists' });

    const recycler = await Recycler.create({ user: req.user._id, ...req.body });
    res.status(201).json({ success: true, message: 'Recycler profile created. Awaiting verification.', data: recycler });
  } catch (err) { next(err); }
});

// @desc  Get recycler profile (own)
router.get('/profile', protect, authorize('recycler'), async (req, res, next) => {
  try {
    const recycler = await Recycler.findOne({ user: req.user._id })
      .populate('acceptedWasteTypes', 'name category icon');
    if (!recycler) return res.status(404).json({ success: false, message: 'Recycler profile not found' });
    res.status(200).json({ success: true, data: recycler });
  } catch (err) { next(err); }
});

// @desc  Update recycler profile
router.put('/profile', protect, authorize('recycler'), async (req, res, next) => {
  try {
    const allowed = ['organizationName', 'serviceAreas', 'acceptedWasteTypes',
                     'operationalHours', 'vehicleCount', 'monthlyCapacity', 'description', 'website'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const recycler = await Recycler.findOneAndUpdate({ user: req.user._id }, updates, { new: true });
    res.status(200).json({ success: true, data: recycler });
  } catch (err) { next(err); }
});

// @desc  Upload certification documents
router.post('/documents', protect, authorize('recycler'), upload.array('documents', 5), async (req, res, next) => {
  try {
    const docs = req.files.map(f => ({ name: f.originalname, url: `/uploads/documents/${f.filename}` }));
    const recycler = await Recycler.findOneAndUpdate(
      { user: req.user._id },
      { $push: { documents: { $each: docs } } },
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Documents uploaded', data: recycler.documents });
  } catch (err) { next(err); }
});

// @desc  Get assigned pickups for this recycler
router.get('/pickups', protect, authorize('recycler'), async (req, res, next) => {
  try {
    const recycler = await Recycler.findOne({ user: req.user._id });
    if (!recycler) return res.status(404).json({ success: false, message: 'Recycler profile not found' });

    const { status, page = 1, limit = 10 } = req.query;
    const query = { 'assignedTo.entity': recycler._id, 'assignedTo.entityType': 'Recycler' };
    if (status) query.status = status;

    const options = {
      page: parseInt(page), limit: parseInt(limit), sort: { scheduledDate: 1 },
      populate: [{ path: 'user', select: 'name phone address' }, { path: 'items.wasteType', select: 'name category' }]
    };

    const result = await Pickup.paginate(query, options);
    res.status(200).json({
      success: true, data: result.docs,
      pagination: { total: result.totalDocs, page: result.page, pages: result.totalPages }
    });
  } catch (err) { next(err); }
});

// @desc  Public: list verified recyclers (for admin/household to find)
router.get('/', async (req, res, next) => {
  try {
    const { city, state, wasteType, page = 1, limit = 10 } = req.query;
    const query = { isVerified: true, isActive: true };
    if (city) query['serviceAreas.city'] = new RegExp(city, 'i');
    if (state) query['serviceAreas.state'] = new RegExp(state, 'i');
    if (wasteType) query.acceptedWasteTypes = wasteType;

    const options = {
      page: parseInt(page), limit: parseInt(limit),
      populate: [{ path: 'user', select: 'name email' }, { path: 'acceptedWasteTypes', select: 'name category' }]
    };

    const result = await Recycler.paginate(query, options);
    res.status(200).json({
      success: true, data: result.docs,
      pagination: { total: result.totalDocs, page: result.page, pages: result.totalPages }
    });
  } catch (err) { next(err); }
});

// @desc  Get single recycler
router.get('/:id', async (req, res, next) => {
  try {
    const recycler = await Recycler.findById(req.params.id)
      .populate('user', 'name email')
      .populate('acceptedWasteTypes', 'name category icon');
    if (!recycler) return res.status(404).json({ success: false, message: 'Recycler not found' });
    res.status(200).json({ success: true, data: recycler });
  } catch (err) { next(err); }
});

// @desc  Admin: verify recycler
router.patch('/:id/verify', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const recycler = await Recycler.findByIdAndUpdate(req.params.id, {
      verificationStatus: status,
      verificationNote: note,
      isVerified: status === 'approved'
    }, { new: true });

    if (!recycler) return res.status(404).json({ success: false, message: 'Recycler not found' });
    res.status(200).json({ success: true, message: `Recycler ${status}`, data: recycler });
  } catch (err) { next(err); }
});

module.exports = router;
