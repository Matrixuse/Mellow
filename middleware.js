const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user to the request (optional, but good practice)
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            res.status(401).json({ message: 'Invalid token' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };

