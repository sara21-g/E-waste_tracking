const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const {
  schedulePickup, getUserPickups, getPickup,
  updatePickupStatus, cancelPickup, ratePickup,
  getPickupOTP, verifyPickupOTP, getAllPickups
} = require('../controllers/pickupController');

router.use(protect);

// User routes
router.post('/', [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.wasteType').notEmpty().withMessage('Waste type is required for each item'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.condition').isIn(['working', 'partially_working', 'not_working', 'damaged']),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date required'),
  body('pickupAddress.street').notEmpty().withMessage('Street address is required'),
  body('pickupAddress.city').notEmpty().withMessage('City is required'),
  body('pickupAddress.state').notEmpty().withMessage('State is required'),
  body('pickupAddress.pincode').notEmpty().withMessage('Pincode is required'),
  validate
], schedulePickup);

router.get('/', getUserPickups);
router.get('/admin/all', authorize('admin'), getAllPickups);
router.get('/:id', getPickup);
router.get('/:id/otp', getPickupOTP);
router.post('/:id/verify-otp', verifyPickupOTP);
router.post('/:id/rate', [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  validate
], ratePickup);
router.delete('/:id', cancelPickup);

// Recycler / NGO / Admin routes
router.patch('/:id/status', authorize('recycler', 'ngo', 'admin'), [
  body('status').isIn(['confirmed', 'in_transit', 'collected', 'processed', 'cancelled'])
    .withMessage('Invalid status'),
  validate
], updatePickupStatus);

// Upload waste item images
router.post('/:id/images', upload.array('wasteImages', 5), async (req, res, next) => {
  try {
    const Pickup = require('../models/Pickup');
    const pickup = await Pickup.findById(req.params.id);
    if (!pickup) return res.status(404).json({ success: false, message: 'Pickup not found' });

    const imageUrls = req.files.map(f => `/uploads/waste/${f.filename}`);
    // Attach to first item or specific item
    const itemIndex = parseInt(req.body.itemIndex) || 0;
    if (pickup.items[itemIndex]) {
      pickup.items[itemIndex].images.push(...imageUrls);
      await pickup.save();
    }

    res.status(200).json({ success: true, data: { images: imageUrls } });
  } catch (err) { next(err); }
});

module.exports = router;
