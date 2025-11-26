const jwt = require('jsonwebtoken');
const db = require('../database');
const bcrypt = require('bcryptjs');
let UserModel = null;
try {
    if (process.env.MONGO_URI) UserModel = require('../models/User');
} catch (e) {}

// Yeh normal user ke liye "Security Guard" hai
const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Header se token nikaalna
            token = req.headers.authorization.split(' ')[1];

            // Token ko verify karna
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // User ki ID token se nikaal kar request mein daalna
            // Also attach common optional fields if present (isAdmin, email, name)
            req.user = { id: decoded.id };
            if (decoded.isAdmin !== undefined) req.user.isAdmin = decoded.isAdmin;
            if (decoded.email) req.user.email = decoded.email;
            if (decoded.name) req.user.name = decoded.name;
            return next(); // Sab theek hai, aage badho
        } catch (error) {
            console.error(error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            }
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Humne yahan se adminProtect hata diya hai
// Admin credentials that the frontend expects
const ADMIN_USERNAME = 'Admin';
const ADMIN_EMAIL = 'namansdnasharma1486@gmail.com';
const ADMIN_PASSWORD = 'Naman@Admin04';

// adminProtect: ensures the authenticated user is the admin user
const adminProtect = async (req, res, next) => {
    // protect must have run already to attach req.user
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Not authorized' });
    }

    try {
        // If MongoDB is configured, use User model
        if (UserModel) {
            const userDoc = await UserModel.findById(req.user.id).lean();
            if (!userDoc) return res.status(401).json({ message: 'User not found' });

            if (userDoc.name !== ADMIN_USERNAME || userDoc.email !== ADMIN_EMAIL) {
                return res.status(403).json({ message: 'Forbidden: admin only' });
            }

            const match = await bcrypt.compare(ADMIN_PASSWORD, userDoc.password);
            if (!match) return res.status(403).json({ message: 'Forbidden: admin only' });

            return next();
        }

        // Fallback to SQLite
        db.get('SELECT * FROM users WHERE id = ?', [req.user.id], async (err, user) => {
            if (err) {
                console.error('DB error in adminProtect:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            // Check username and email
            if (user.name !== ADMIN_USERNAME || user.email !== ADMIN_EMAIL) {
                return res.status(403).json({ message: 'Forbidden: admin only' });
            }

            // Verify the stored hashed password matches the known admin password
            const match = await bcrypt.compare(ADMIN_PASSWORD, user.password);
            if (!match) {
                return res.status(403).json({ message: 'Forbidden: admin only' });
            }

            // All good
            next();
        });
    } catch (error) {
        console.error('Error in adminProtect:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { protect, adminProtect };

