const jwt = require('jsonwebtoken');

const authenticateAgent = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'Invalid token format' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.agentId = decoded.agentId;
        req.agentEmail = decoded.email;
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
};

module.exports = { authenticateAgent };