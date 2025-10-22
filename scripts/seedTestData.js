const db = require('../database');

const seed = () => {
  db.serialize(() => {
    // Insert test user if not exists
    db.get('SELECT id FROM users WHERE email = ?', ['test@example.com'], (err, user) => {
      if (err) return console.error('User lookup error', err);
      if (user) {
        console.log('Test user already exists with id', user.id);
      } else {
        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', ['Test User', 'test@example.com', 'passwordhash'], function(err) {
          if (err) return console.error('Failed to insert test user', err);
          console.log('Inserted test user id', this.lastID);
        });
      }
    });

    // Insert test song if not exists
    db.get('SELECT id FROM songs WHERE title = ? LIMIT 1', ['Test Song'], (err, song) => {
      if (err) return console.error('Song lookup error', err);
      if (song) {
        console.log('Test song already exists with id', song.id);
      } else {
        db.run('INSERT INTO songs (title, artist, songUrl, coverUrl, moods) VALUES (?, ?, ?, ?, ?)', ['Test Song', JSON.stringify(['Test Artist']), '/songs/test.mp3', '/covers/test.jpg', JSON.stringify(['chill'])], function(err) {
          if (err) return console.error('Failed to insert test song', err);
          console.log('Inserted test song id', this.lastID);
        });
      }
    });

    // Insert test playlist for test user
    db.get('SELECT id FROM users WHERE email = ?', ['test@example.com'], (err, userRow) => {
      if (err) return console.error('User lookup error for playlist', err);
      if (!userRow) return console.log('Test user not present yet; playlist will be created on next run.');
      db.get('SELECT id FROM playlists WHERE name = ? AND userId = ?', ['Test Playlist', userRow.id], (err, pl) => {
        if (err) return console.error('Playlist lookup error', err);
        if (pl) {
          console.log('Test playlist already exists with id', pl.id);
        } else {
          db.run('INSERT INTO playlists (name, description, userId) VALUES (?, ?, ?)', ['Test Playlist', 'Seeded test playlist', userRow.id], function(err) {
            if (err) return console.error('Failed to insert test playlist', err);
            console.log('Inserted test playlist id', this.lastID);
          });
        }
      });
    });
  });
};

seed();

setTimeout(() => process.exit(0), 1000);
