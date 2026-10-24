const jwt = require('jsonwebtoken');
const logger = require('../services/logger');

// Admin email addresses that have access to the dashboard
const ADMIN_EMAILS = [
    'rimelaafia@gmail.com'
];

/**
 * Middleware to authenticate admin users
 */
function authenticateAdmin(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1] || 
                     req.cookies?.authToken || 
                     req.query.token;

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Access denied. No token provided.' 
            });
        }

        // Verify and decode JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user email is in admin list
        if (!ADMIN_EMAILS.includes(decoded.email)) {
            logger.warn(`Unauthorized admin access attempt by: ${decoded.email}`);
            return res.status(403).json({ 
                success: false, 
                error: 'Access denied. Admin privileges required.' 
            });
        }

        // Add admin info to request
        req.admin = {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name
        };

        logger.info(`Admin dashboard accessed by: ${decoded.email}`);
        next();

    } catch (error) {
        logger.error('Admin authentication error:', error);
        return res.status(401).json({ 
            success: false, 
            error: 'Access denied. Invalid token.' 
        });
    }
}

/**
 * Check if user is admin (for client-side checks)
 */
function isAdmin(userEmail) {
    return ADMIN_EMAILS.includes(userEmail);
}

module.exports = {
    authenticateAdmin,
    isAdmin,
    ADMIN_EMAILS
};