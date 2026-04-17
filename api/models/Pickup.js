const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const pickupSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: uuidv4
    },
    user_email: {
        type: String,
        required: true
    },
    agent_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    },
    item_description: {
        type: String,
        required: true
    },
    estimated_weight_kg: {
        type: Number,
        required: true
    },
    pickup_lat: {
        type: Number
    },
    pickup_lng: {
        type: Number
    },
    pickup_address: {
        type: String
    },
    status: {
        type: String,
        default: 'PENDING'
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Convert `_id` to `id` conceptually without issues in response if needed
pickupSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
});

module.exports = mongoose.model('Pickup', pickupSchema);