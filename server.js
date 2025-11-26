require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const playlistRoutes = require('./routes/playlists');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB Atlas if MONGO_URI is provided
try {
    const connectMongo = require('./config/mongo');
    connectMongo().catch(err => {
        console.warn('MongoDB connection could not be established:', err && err.message ? err.message : err);
    });
} catch (err) {
    console.warn('MongoDB connect module not found or failed to load:', err && err.message ? err.message : err);
}

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
app.use('/api/playlists', playlistRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('Music Player API is running!');
});

// Start server with automatic fallback: if the chosen port is in use,
// try the next port up to `maxAttempts` times (default 10).
const http = require('http');

function startServer(initialPort, maxAttempts = 10) {
    let attempts = 0;
    let port = Number(initialPort) || 5000;

    const tryListen = () => {
        const server = http.createServer(app);

        server.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

        server.on('error', (err) => {
            if (err && err.code === 'EADDRINUSE') {
                attempts += 1;
                if (attempts <= maxAttempts) {
                    const nextPort = port + 1;
                    console.warn(`Port ${port} is in use, trying port ${nextPort} (attempt ${attempts}/${maxAttempts})...`);
                    port = nextPort;
                    // small delay before retrying
                    setTimeout(tryListen, 200);
                    return;
                }

                console.error(`All ${maxAttempts} port attempts failed starting at ${initialPort}.`);
                console.error(`Please stop the process using the port or set a different PORT environment variable.`);
                console.error('On Windows you can run:');
                console.error('  netstat -ano | findstr :' + initialPort);
                console.error('  taskkill /PID <pid> /F');
                process.exit(1);
            }

            console.error('Server error:', err);
            process.exit(1);
        });
    };

    tryListen();
}

startServer(PORT);