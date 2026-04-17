const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const NGO = require('../models/NGO');
const Pickup = require('../models/Pickup');

// @desc  Register NGO profile
router.post('/register', protect, authorize('ngo'), [
  body('organizationName').trim().notEmpty().withMessage('Organization name is required'),
  body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
  body('ngoType').isIn(['trust', 'society', 'section8_company', 'other']).withMessage('Invalid NGO type'),
  validate
], async (req, res, next) => {
  try {
    const exists = await NGO.findOne({ user: req.user._id });
    if (exists) return res.status(400).json({ success: false, message: 'NGO profile already exists' });

    const ngo = await NGO.create({ user: req.user._id, ...req.body });
    res.status(201).json({ success: true, message: 'NGO profile created. Awaiting verification.', data: ngo });
  } catch (err) { next(err); }
});

// @desc  Get own NGO profile
router.get('/profile', protect, authorize('ngo'), async (req, res, next) => {
  try {
    const ngo = await NGO.findOne({ user: req.user._id })
      .populate('acceptedWasteTypes', 'name category icon')
      .populate('partnerRecyclers', 'organizationName rating serviceAreas');
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO profile not found' });
    res.status(200).json({ success: true, data: ngo });
  } catch (err) { next(err); }
});

// @desc  Update NGO profile
router.put('/profile', protect, authorize('ngo'), async (req, res, next) => {
  try {
    const allowed = ['organizationName', 'focusArea', 'serviceAreas', 'acceptedWasteTypes',
                     'description', 'website', 'socialLinks'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const ngo = await NGO.findOneAndUpdate({ user: req.user._id }, updates, { new: true });
    res.status(200).json({ success: true, data: ngo });
  } catch (err) { next(err); }
});

// @desc  Upload logo and documents
router.post('/documents', protect, authorize('ngo'), upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]), async (req, res, next) => {
  try {
    const updates = {};
    if (req.files?.logo) updates.logo = `/uploads/logos/${req.files.logo[0].filename}`;
    if (req.files?.documents) {
      updates.$push = {
        documents: {
          $each: req.files.documents.map(f => ({ name: f.originalname, url: `/uploads/documents/${f.filename}` }))
        }
      };
    }
    const ngo = await NGO.findOneAndUpdate({ user: req.user._id }, updates, { new: true });
    res.status(200).json({ success: true, data: ngo });
  } catch (err) { next(err); }
});

// @desc  Get assigned pickups
router.get('/pickups', protect, authorize('ngo'), async (req, res, next) => {
  try {
    const ngo = await NGO.findOne({ user: req.user._id });
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO profile not found' });

    const { status, page = 1, limit = 10 } = req.query;
    const query = { 'assignedTo.entity': ngo._id, 'assignedTo.entityType': 'NGO' };
    if (status) query.status = status;

    const result = await Pickup.paginate(query, {
      page: parseInt(page), limit: parseInt(limit), sort: { scheduledDate: 1 },
      populate: [{ path: 'user', select: 'name phone' }, { path: 'items.wasteType', select: 'name' }]
    });

    res.status(200).json({
      success: true, data: result.docs,
      pagination: { total: result.totalDocs, page: result.page, pages: result.totalPages }
    });
  } catch (err) { next(err); }
});

// @desc  Add partner recycler
router.post('/partner-recyclers', protect, authorize('ngo'), async (req, res, next) => {
  try {
    const { recyclerId } = req.body;
    const Recycler = require('../models/Recycler');
    const recycler = await Recycler.findOne({ _id: recyclerId, isVerified: true });
    if (!recycler) return res.status(404).json({ success: false, message: 'Verified recycler not found' });

    const ngo = await NGO.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { partnerRecyclers: recyclerId } },
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Partner recycler added', data: ngo.partnerRecyclers });
  } catch (err) { next(err); }
});

// @desc  Public: list verified NGOs
router.get('/', async (req, res, next) => {
  try {
    const { city, state, page = 1, limit = 10 } = req.query;
    const query = { isVerified: true, isActive: true };
    if (city) query['serviceAreas.city'] = new RegExp(city, 'i');
    if (state) query['serviceAreas.state'] = new RegExp(state, 'i');

    const result = await NGO.paginate(query, {
      page: parseInt(page), limit: parseInt(limit),
      populate: { path: 'user', select: 'name email' }
    });
    res.status(200).json({
      success: true, data: result.docs,
      pagination: { total: result.totalDocs, page: result.page, pages: result.totalPages }
    });
  } catch (err) { next(err); }
});

// @desc  Get single NGO
router.get('/:id', async (req, res, next) => {
  try {
    const ngo = await NGO.findById(req.params.id)
      .populate('user', 'name email')
      .populate('acceptedWasteTypes', 'name category icon');
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });
    res.status(200).json({ success: true, data: ngo });
  } catch (err) { next(err); }
});

// @desc  Admin: verify NGO
router.patch('/:id/verify', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { status, note } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }
    const ngo = await NGO.findByIdAndUpdate(req.params.id, {
      verificationStatus: status,
      verificationNote: note,
      isVerified: status === 'approved'
    }, { new: true });

    if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });
    res.status(200).json({ success: true, message: `NGO ${status}`, data: ngo });
  } catch (err) { next(err); }
});

module.exports = router;
