const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Humne path ko theek kiya hai taaki database file backend folder ke andar bane
const dbPath = path.resolve(__dirname, '..', 'music_app.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log("Database connected successfully.");
    }
});

db.serialize(() => {
    // Users table waisi hi rahegi
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`);

    // --- YAHAN HUMNE BADLAAV KIYA HAI ---
    // Humne yahan se 'uploaderId' waala column poori tarah se hata diya hai
    db.run(`CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        songUrl TEXT NOT NULL,
        coverUrl TEXT NOT NULL,
        moods TEXT DEFAULT '[]'
    )`);
    
    // Add moods column to existing songs table if it doesn't exist
    db.run(`ALTER TABLE songs ADD COLUMN moods TEXT DEFAULT '[]'`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding moods column:', err.message);
        }
    });
    
    // Create playlists table (ensure playlists live in the same DB as songs)
    db.run(`CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        userId INTEGER NOT NULL,
        isPublic BOOLEAN DEFAULT 0,
        coverUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // Create playlist_songs junction table
    db.run(`CREATE TABLE IF NOT EXISTS playlist_songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlistId INTEGER NOT NULL,
        songId INTEGER NOT NULL,
        position INTEGER NOT NULL,
        addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playlistId) REFERENCES playlists (id) ON DELETE CASCADE,
        FOREIGN KEY (songId) REFERENCES songs (id) ON DELETE CASCADE,
        UNIQUE(playlistId, songId)
    )`);

    // user_favorites and recently_played to match other DB initializers
    db.run(`CREATE TABLE IF NOT EXISTS user_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        songId INTEGER NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (songId) REFERENCES songs (id) ON DELETE CASCADE,
        UNIQUE(userId, songId)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS recently_played (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        songId INTEGER NOT NULL,
        playedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (songId) REFERENCES songs (id) ON DELETE CASCADE
    )`);
});

module.exports = db;

