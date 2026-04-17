const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const recyclerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organizationName: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true
  },
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true
  },
  certifications: [{
    name: String,
    issuingBody: String,
    certificateNumber: String,
    validUntil: Date,
    documentUrl: String,
    verified: { type: Boolean, default: false }
  }],
  serviceAreas: [{
    city: String,
    state: String,
    pincode: String,
    radius: Number // in km
  }],
  acceptedWasteTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WasteType'
  }],
  operationalHours: {
    monday: { open: String, close: String, isOpen: Boolean },
    tuesday: { open: String, close: String, isOpen: Boolean },
    wednesday: { open: String, close: String, isOpen: Boolean },
    thursday: { open: String, close: String, isOpen: Boolean },
    friday: { open: String, close: String, isOpen: Boolean },
    saturday: { open: String, close: String, isOpen: Boolean },
    sunday: { open: String, close: String, isOpen: Boolean }
  },
  vehicleCount: { type: Number, default: 0 },
  monthlyCapacity: Number, // in kg
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationNote: String,
  totalPickupsCompleted: { type: Number, default: 0 },
  totalWasteProcessed: { type: Number, default: 0 }, // in kg
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  website: String,
  description: String,
  logo: String,
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

recyclerSchema.virtual('averageRating').get(function () {
  return this.ratingCount > 0 ? (this.rating / this.ratingCount).toFixed(1) : 0;
});

recyclerSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Recycler', recyclerSchema);
