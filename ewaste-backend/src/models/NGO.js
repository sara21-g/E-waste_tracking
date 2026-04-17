const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ngoSchema = new mongoose.Schema({
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
    required: [true, 'NGO registration number is required'],
    unique: true
  },
  ngoType: {
    type: String,
    enum: ['trust', 'society', 'section8_company', 'other'],
    required: true
  },
  focusArea: [String], // e.g., ['e-waste', 'environment', 'education']
  serviceAreas: [{
    city: String,
    state: String,
    pincode: String
  }],
  acceptedWasteTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WasteType'
  }],
  partnerRecyclers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recycler'
  }],
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected'],
    default: 'pending'
  },
  verificationNote: String,
  totalPickupsHandled: { type: Number, default: 0 },
  totalWasteCollected: { type: Number, default: 0 },
  impactReport: {
    treesEquivalent: { type: Number, default: 0 },
    co2Reduced: { type: Number, default: 0 },
    familiesHelped: { type: Number, default: 0 }
  },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  website: String,
  description: String,
  logo: String,
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

ngoSchema.virtual('averageRating').get(function () {
  return this.ratingCount > 0 ? (this.rating / this.ratingCount).toFixed(1) : 0;
});

ngoSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('NGO', ngoSchema);
