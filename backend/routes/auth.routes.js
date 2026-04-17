const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Agent = require('../models/Agent');
const Admin = require('../models/Admin');

const router = express.Router();

// Agent Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);
        
        const agent = await Agent.findOne({ email, is_active: true });
        
        if (!agent) {
            console.log('No active agent found with email:', email);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, agent.password_hash);
        
        if (!validPassword) {
            console.log('Invalid password for:', email);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { agentId: agent._id.toString(), email: agent.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        console.log('Agent Login successful:', email);
        
        res.json({
            success: true,
            token,
            agent: {
                id: agent._id.toString(),
                email: agent.email,
                fullName: agent.full_name,
                ngoId: agent.ngo_id
            }
        });
        
    } catch (error) {
        console.error('Agent Login error details:', error);
        res.status(500).json({ success: false, error: 'Server error during login' });
    }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Admin Login attempt:', email);
        
        const admin = await Admin.findOne({ email });
        
        if (!admin) {
            console.log('No admin found with email:', email);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!validPassword) {
            console.log('Invalid admin password for:', email);
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { adminId: admin._id.toString(), email: admin.email, role: 'admin' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        console.log('Admin Login successful:', email);
        
        res.json({
            success: true,
            token,
            admin: {
                id: admin._id.toString(),
                email: admin.email,
                fullName: admin.full_name
            }
        });
        
    } catch (error) {
        console.error('Admin Login error details:', error);
        res.status(500).json({ success: false, error: 'Server error during admin login' });
    }
});

// Verify Agent Token
router.get('/verify', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ valid: false });
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        res.json({ valid: true, agentId: decoded.agentId });
    } catch (error) {
        res.status(401).json({ valid: false });
    }
});

// Verify Admin Token
router.get('/admin/verify', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ valid: false });
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (decoded.role !== 'admin') return res.status(401).json({ valid: false });
        res.json({ valid: true, adminId: decoded.adminId });
    } catch (error) {
        res.status(401).json({ valid: false });
    }
});

module.exports = router;