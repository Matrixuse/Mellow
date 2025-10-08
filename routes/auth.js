const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database.js');
const router = express.Router();

// --- User Registration ---
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

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
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

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

