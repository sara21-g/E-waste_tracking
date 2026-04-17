require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', process.env.FRONTEND_URL],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
const authRoutes = require('./routes/auth.routes');
const pickupRoutes = require('./routes/pickup.routes');

app.use('/api/auth', authRoutes);
app.use('/api/pickup', pickupRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'E-Waste Tracking API'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'E-Waste Tracking API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            pickup: '/api/pickup'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('🔥 SERVER ERROR:');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    
    res.status(500).json({ 
        success: false, 
        error: err.message || 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║   ♻️  E-Waste Tracking API Started    ║
    ╠════════════════════════════════════════╣
    ║   Server: http://localhost:${PORT}        ║
    ║   Health: http://localhost:${PORT}/api/health ║
    ╚════════════════════════════════════════╝
    `);
});

module.exports = app;