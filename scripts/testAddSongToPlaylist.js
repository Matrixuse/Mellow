const http = require('http');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const db = require('../database');
const jwt = require('jsonwebtoken');

const API_HOST = 'localhost';
const API_PORT = 5000;

const run = () => {
  // Build a token for user id 1 (our seed uses id 1)
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '1d' });

  db.get('SELECT id FROM songs WHERE title = ? LIMIT 1', ['Test Song'], (err, songRow) => {
    if (err) return console.error('Error fetching song', err);
    if (!songRow) return console.error('Test Song not found');

    db.get('SELECT id FROM playlists WHERE name = ? LIMIT 1', ['Test Playlist'], (err, plRow) => {
      if (err) return console.error('Error fetching playlist', err);
      if (!plRow) return console.error('Test Playlist not found');

      const path = `/api/playlists/${plRow.id}/songs`;
      const body = JSON.stringify({ songId: songRow.id });

      const options = {
        hostname: API_HOST,
        port: API_PORT,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Authorization': `Bearer ${token}`
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('Status', res.statusCode);
          console.log('Body', data);
        });
      });

      req.on('error', (e) => console.error('Request error', e));
      req.write(body);
      req.end();
    });
  });
};

run();
