require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');

const app = express();
const PORT = process.env.PORT || 5000;

// --- YAHAN BADLAAV KIYA GAYA HAI ---
// CORS ko theek kiya gaya hai taaki mobile app se bhi request aa sake
const corsOptions = {
    origin: '*', // Sabhi origins se request allow karega
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
// --- END OF CHANGE ---

app.use(express.json());

// Serve static files for songs and covers
app.use('/songs', express.static(path.join(__dirname, 'public/songs')));
app.use('/covers', express.static(path.join(__dirname, 'public/covers')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('Music Player API is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});