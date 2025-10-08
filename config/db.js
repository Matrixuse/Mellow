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
        coverUrl TEXT NOT NULL
    )`);
});

module.exports = db;

