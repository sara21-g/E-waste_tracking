const mongoose = require('mongoose');

// ─── Waste Type ───────────────────────────────────────────────────────────────
const wasteTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Waste type name is required'],
    unique: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['large_appliances', 'small_appliances', 'it_equipment', 'screens', 'lamps', 'toys_leisure', 'tools', 'medical', 'batteries', 'other'],
    required: true
  },
  description: String,
  icon: String,
  carbonEmissionFactor: {
    type: Number,
    required: true, // kg CO2e per kg of waste recycled
    default: 1.5
  },
  pointsPerKg: {
    type: Number,
    required: true,
    default: 10
  },
  hazardLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  handlingInstructions: String,
  avgWeightKg: Number, // average weight of one unit
  isActive: { type: Boolean, default: true },
  examples: [String] // e.g., ['Laptop', 'Desktop', 'Server']
}, { timestamps: true });

// ─── Carbon Credit Transaction ────────────────────────────────────────────────
const carbonCreditSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pickup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pickup'
  },
  transactionType: {
    type: String,
    enum: ['earned', 'redeemed', 'transferred', 'expired', 'bonus'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  carbonReduced: {
    type: Number,
    default: 0 // kg CO2e
  },
  description: String,
  balanceAfter: Number,
  expiresAt: Date,
  redeemDetails: {
    rewardType: String, // 'coupon', 'voucher', 'donation', 'cashback'
    rewardCode: String,
    rewardValue: Number
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// ─── Reward / Redemption Catalog ──────────────────────────────────────────────
const rewardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  rewardType: {
    type: String,
    enum: ['coupon', 'voucher', 'donation', 'cashback', 'tree_plant'],
    required: true
  },
  pointsRequired: { type: Number, required: true },
  monetaryValue: Number,
  partnerName: String,
  partnerLogo: String,
  stockAvailable: { type: Number, default: -1 }, // -1 = unlimited
  validUntil: Date,
  termsAndConditions: String,
  isActive: { type: Boolean, default: true },
  redemptionCount: { type: Number, default: 0 }
}, { timestamps: true });

// ─── Notification ─────────────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['pickup_scheduled', 'pickup_confirmed', 'pickup_assigned', 'pickup_collected',
           'pickup_processed', 'pickup_cancelled', 'points_earned', 'points_redeemed',
           'certificate_ready', 'system', 'promotion'],
    required: true
  },
  isRead: { type: Boolean, default: false },
  data: mongoose.Schema.Types.Mixed, // extra payload
  link: String
}, { timestamps: true });

module.exports = {
  WasteType: mongoose.model('WasteType', wasteTypeSchema),
  CarbonCredit: mongoose.model('CarbonCredit', carbonCreditSchema),
  Reward: mongoose.model('Reward', rewardSchema),
  Notification: mongoose.model('Notification', notificationSchema)
};
