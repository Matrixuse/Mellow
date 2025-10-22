const db = require('../database');
const controller = require('../controllers/playlistController');

// Find test song and playlist
db.get('SELECT id FROM songs WHERE title = ? LIMIT 1', ['Test Song'], (err, songRow) => {
  if (err) return console.error('Error fetching song', err);
  if (!songRow) return console.error('Test Song not found');

  db.get('SELECT id FROM playlists WHERE name = ? LIMIT 1', ['Test Playlist'], (err, plRow) => {
    if (err) return console.error('Error fetching playlist', err);
    if (!plRow) return console.error('Test Playlist not found');

    const req = {
      params: { id: plRow.id },
      body: { songId: songRow.id },
      user: { id: 1 }
    };

    const res = {
      status(code) { this.statusCode = code; return this; },
      json(obj) { console.log('JSON response', this.statusCode || 200, obj); },
      send(obj) { console.log('Send response', this.statusCode || 200, obj); }
    };

    console.log('Calling addSongToPlaylist with', { playlistId: plRow.id, songId: songRow.id });
    controller.addSongToPlaylist(req, res);
  });
});
