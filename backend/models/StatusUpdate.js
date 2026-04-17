const mongoose = require('mongoose');

const statusUpdateSchema = new mongoose.Schema({
    pickup_id: {
        type: String,
        ref: 'Pickup',
        required: true
    },
    status: {
        type: String,
        required: true
    },
    location: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: null
    },
    updated_by: {
        type: String,
        default: null
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('StatusUpdate', statusUpdateSchema);
