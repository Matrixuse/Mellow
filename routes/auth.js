const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database.js');
const router = express.Router();

// Get UserModel - will be available after mongoose connects
function getUserModel() {
    try {
        return require('../models/User');
    } catch (e) {
        console.error('Error loading UserModel:', e.message);
        return null;
    }
}

// --- User Registration ---
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    const UserModel = getUserModel();

    // If MongoDB is available, create user in MongoDB
    if (UserModel) {
        try {
            const exists = await UserModel.findOne({ email });
            if (exists) {
                return res.status(400).json({ message: 'User already exists' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const userDoc = await UserModel.create({ name, email, password: hashedPassword });
            
            const token = jwt.sign(
                { id: userDoc._id, email: userDoc.email, name: userDoc.name },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            return res.status(201).json({
                token,
                user: { id: userDoc._id, name: userDoc.name, email: userDoc.email }
            });
        } catch (err) {
            console.error('MongoDB registration error:', err.message);
            return res.status(500).json({ message: 'Database error on user creation' });
        }
    }

    // Fallback to SQLite
    db.get('SELECT email FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error on user check' });
        if (user) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        db.run(sql, [name, email, hashedPassword], function(err) {
            if (err) return res.status(500).json({ message: 'Database error on user creation' });
            
            const token = jwt.sign({ id: this.lastID }, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({ token, user: { id: this.lastID, name, email } });
        });
    });
});

// --- User Login ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    const UserModel = getUserModel();

    // If MongoDB is available, authenticate against MongoDB
    if (UserModel) {
        try {
            const userDoc = await UserModel.findOne({ email });
            if (!userDoc) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            
            const isMatch = await bcrypt.compare(password, userDoc.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            
            const token = jwt.sign(
                { id: userDoc._id, email: userDoc.email, name: userDoc.name },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            
            return res.json({
                token,
                user: { id: userDoc._id, name: userDoc.name, email: userDoc.email }
            });
        } catch (err) {
            console.error('MongoDB login error:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }
    }

    // Fallback to SQLite
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], async (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
});

module.exports = router;

