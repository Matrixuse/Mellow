const jwt = require('jsonwebtoken');

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
            req.user = { id: decoded.id };
            next(); // Sab theek hai, aage badho
        } catch (error) {
            console.error(error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            }
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Humne yahan se adminProtect hata diya hai
module.exports = { protect };

