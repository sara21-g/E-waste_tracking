const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const pickupItemSchema = new mongoose.Schema({
  wasteType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WasteType',
    required: true
  },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  estimatedWeight: { type: Number }, // in kg
  actualWeight: { type: Number },    // filled after pickup
  condition: {
    type: String,
    enum: ['working', 'partially_working', 'not_working', 'damaged'],
    required: true
  },
  images: [String]
});

const pickupSchema = new mongoose.Schema({
  pickupId: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'assignedTo.entityType'
    },
    entityType: {
      type: String,
      enum: ['Recycler', 'NGO']
    }
  },
  items: [pickupItemSchema],
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  timeSlot: {
    start: String, // e.g., "10:00"
    end: String    // e.g., "12:00"
  },
  pickupAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'assigned', 'in_transit', 'collected', 'processed', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  totalEstimatedWeight: { type: Number, default: 0 },
  totalActualWeight: { type: Number, default: 0 },
  carbonPointsAwarded: { type: Number, default: 0 },
  carbonReduced: { type: Number, default: 0 }, // kg CO2e
  certificateGenerated: { type: Boolean, default: false },
  certificateUrl: String,
  otp: String,                     // for pickup verification
  otpExpire: Date,
  userRating: { type: Number, min: 1, max: 5 },
  userFeedback: String,
  specialInstructions: String,
  cancellationReason: String,
  completedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Auto-generate pickupId
pickupSchema.pre('validate', async function (next) {
  if (!this.pickupId) {
    const { v4: uuidv4 } = require('uuid');
    this.pickupId = 'PKP-' + uuidv4().substring(0, 8).toUpperCase();
  }
  next();
});

// Calculate total estimated weight from items
pickupSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.totalEstimatedWeight = this.items.reduce((sum, item) => {
      return sum + (item.estimatedWeight || 0) * (item.quantity || 1);
    }, 0);
  }
  next();
});

pickupSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Pickup', pickupSchema);
