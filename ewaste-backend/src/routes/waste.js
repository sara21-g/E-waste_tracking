const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { WasteType } = require('../models/index');

// @desc  Get all active waste types (public)
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;

    const wasteTypes = await WasteType.find(query).sort({ category: 1, name: 1 });
    res.status(200).json({ success: true, count: wasteTypes.length, data: wasteTypes });
  } catch (err) { next(err); }
});

// @desc  Get single waste type (public)
router.get('/:id', async (req, res, next) => {
  try {
    const wasteType = await WasteType.findById(req.params.id);
    if (!wasteType) return res.status(404).json({ success: false, message: 'Waste type not found' });
    res.status(200).json({ success: true, data: wasteType });
  } catch (err) { next(err); }
});

// @desc  Create waste type (admin only)
router.post('/', protect, authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('category').isIn(['large_appliances', 'small_appliances', 'it_equipment', 'screens',
    'lamps', 'toys_leisure', 'tools', 'medical', 'batteries', 'other']).withMessage('Invalid category'),
  body('carbonEmissionFactor').isFloat({ min: 0 }).withMessage('Valid carbon emission factor required'),
  body('pointsPerKg').isInt({ min: 1 }).withMessage('Points per kg must be at least 1'),
  validate
], async (req, res, next) => {
  try {
    const wasteType = await WasteType.create(req.body);
    res.status(201).json({ success: true, data: wasteType });
  } catch (err) { next(err); }
});

// @desc  Update waste type (admin only)
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const wasteType = await WasteType.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true
    });
    if (!wasteType) return res.status(404).json({ success: false, message: 'Waste type not found' });
    res.status(200).json({ success: true, data: wasteType });
  } catch (err) { next(err); }
});

// @desc  Delete / deactivate waste type (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const wasteType = await WasteType.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!wasteType) return res.status(404).json({ success: false, message: 'Waste type not found' });
    res.status(200).json({ success: true, message: 'Waste type deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
