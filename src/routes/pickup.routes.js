const express = require('express');
const router = express.Router();
const Pickup = require('../models/Pickup');
const StatusUpdate = require('../models/StatusUpdate');
const qrService = require('../services/qr.service');
const emailService = require('../services/email.service');
const { authenticateAgent } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Simple Admin Authenticator Middleware
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (decoded.role !== 'admin') return res.status(401).json({ success: false, error: 'Unauthorized' });
        req.adminId = decoded.adminId;
        next();
    } catch {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
};

// CONFIRM PICKUP
router.post('/confirm', authenticateAgent, async (req, res) => {
    try {
        const { userEmail, itemDescription, estimatedWeight, latitude, longitude } = req.body;
        const agentId = req.agentId;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userEmail)) {
            return res.status(400).json({ success: false, error: 'Invalid email address' });
        }
        
        const pickup = await Pickup.create({
            user_email: userEmail,
            agent_id: agentId,
            item_description: itemDescription,
            estimated_weight_kg: estimatedWeight,
            pickup_lat: latitude,
            pickup_lng: longitude
        });

        await StatusUpdate.create({
            pickup_id: pickup._id,
            status: 'COLLECTED',
            notes: 'Item collected by NGO agent',
            updated_by: `Agent ${agentId}`
        });
        
        const qrResult = await qrService.generateQRCode(pickup._id);
        
        let emailSent = false;
        try {
            const emailResult = await emailService.sendTrackingEmail(
                userEmail,
                pickup._id,
                qrResult.dataUrl,
                qrResult.url,
                { itemDescription, estimatedWeight }
            );
            emailSent = emailResult.success;
        } catch (e) {
            console.error('Email failed to send natively, ignoring..');
        }
        
        res.status(201).json({
            success: true,
            message: emailSent 
                ? 'Pickup confirmed. QR sent to user.' 
                : 'Pickup confirmed. (Email notification pending)',
            trackingId: pickup._id,
            trackingUrl: qrResult.url,
            qrDataUrl: qrResult.dataUrl,
            emailSent
        });
        
    } catch (error) {
        console.error('Confirm pickup error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// AGENT PICKUPS LIST
router.get('/agent/pickups', authenticateAgent, async (req, res) => {
    try {
        const pickups = await Pickup.find({ agent_id: req.agentId }).sort({ created_at: -1 }).limit(50);
        res.json({ success: true, pickups: pickups.map(p => p.toJSON()) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ADMIN DASHBOARD STATS
router.get('/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const totalPickups = await Pickup.countDocuments();
        const recycledCount = await Pickup.countDocuments({ status: 'RECYCLED' });
        
        const weightAggregation = await Pickup.aggregate([
            { $group: { _id: null, totalWeight: { $sum: "$estimated_weight_kg" } } }
        ]);
        const totalWeight = weightAggregation.length > 0 ? weightAggregation[0].totalWeight : 0;
        
        const recentPickups = await Pickup.find().sort({ created_at: -1 }).limit(10);
        
        res.json({
            success: true,
            stats: {
                totalPickups,
                totalWeight,
                recycledCount,
                totalCredits: totalWeight * 1.5 // example 1.5 credits per kg
            },
            recentPickups: recentPickups.map(p => p.toJSON())
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ADMIN SEARCH
router.get('/search', authenticateAdmin, async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.json({ success: true, pickups: [] });
        
        const isUUID = q.length > 20;

        let queryOpts = {};
        if (isUUID) {
            queryOpts = { _id: q };
        } else {
            queryOpts = { user_email: { $regex: q, $options: 'i' } };
        }

        const pickups = await Pickup.find(queryOpts).limit(20);
        res.json({ success: true, pickups: pickups.map(p => p.toJSON()) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUBLIC TRACKING
router.get('/track/:id', async (req, res) => {
    try {
        const pickup = await Pickup.findById(req.params.id);
        if (!pickup) return res.status(404).json({ success: false, error: 'Invalid Tracking ID' });
        
        const history = await StatusUpdate.find({ pickup_id: pickup._id }).sort({ created_at: 1 });
        const pObj = pickup.toJSON();
        pObj.history = history;
        
        res.json({ success: true, pickup: pObj });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ADMIN UPDATE STATUS
router.put('/status/:trackingId', authenticateAdmin, async (req, res) => {
    try {
        const { status, location, notes, updatedBy } = req.body;
        
        const pickup = await Pickup.findByIdAndUpdate(
            req.params.trackingId, 
            { status },
            { new: true }
        );
        
        if (!pickup) return res.status(404).json({ success: false, error: 'Pickup not found' });
        
        await StatusUpdate.create({
            pickup_id: pickup._id,
            status,
            location,
            notes,
            updated_by: updatedBy || 'System Admin'
        });
        
        res.json({ success: true, pickup: pickup.toJSON() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;