const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'music_player.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDB();
    }
});

const initializeDB = () => {
    db.serialize(() => {
        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);

        // Create songs table
        db.run(`CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            songUrl TEXT NOT NULL,
            coverUrl TEXT NOT NULL
        )`, (err) => {
            if (!err) {
                populateSongsIfEmpty();
            }
        });
    });
};

const populateSongsIfEmpty = () => {
    db.get('SELECT COUNT(*) as count FROM songs', (err, row) => {
        if (err) {
            console.error('Error checking songs table', err.message);
            return;
        }

        if (row.count === 0) {
            console.log('Songs table is empty. Populating...');
            const songsDir = path.join(__dirname, 'public', 'songs');

            fs.readdir(songsDir, (err, files) => {
                if (err) {
                    console.error('Could not list the directory.', err);
                    return;
                }

                const stmt = db.prepare("INSERT INTO songs (title, artist, songUrl, coverUrl) VALUES (?, ?, ?, ?)");

                files.forEach(file => {
                    if (path.extname(file).toLowerCase() === '.mp3') {
                        const baseName = path.parse(file).name;
                        
                        // --- YAHAN BADLAAV KIYA GAYA HAI ---
                        // Ab file ke naam se artist aur title nikala jaayega
                        let artist = 'Unknown Artist';
                        let title = baseName;

                        if (baseName.includes(' - ')) {
                            const parts = baseName.split(' - ');
                            artist = parts[0].trim();
                            title = parts[1].trim();
                        }

                        const songUrl = `/songs/${file}`;
                        const coverUrl = `/covers/${baseName}.jpg`;

                        stmt.run(title, artist, songUrl, coverUrl, (err) => {
                            if(err) console.error('Error inserting song:', file, err.message);
                        });
                        console.log(`A song has been inserted: Title: ${title}, Artist: ${artist}`);
                    }
                });

                stmt.finalize();
            });
        } else {
            console.log('Songs table already populated. Skipping.');
        }
    });
};

module.exports = db;

