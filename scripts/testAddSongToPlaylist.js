const http = require('http');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');
const connectMongo = require('../config/mongo');
const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 5000;

const run = async () => {
  try {
    await connectMongo();
  } catch (err) {
    console.error('Mongo connection failed:', err && err.message ? err.message : err);
    process.exit(1);
  }

  const Song = require('../models/Song');
  const Playlist = require('../models/Playlist');

  const song = await Song.findOne({ title: 'Test Song' }).lean();
  if (!song) return console.error('Test Song not found');

  const pl = await Playlist.findOne({ name: 'Test Playlist' }).lean();
  if (!pl) return console.error('Test Playlist not found');

  // Build token for playlist owner if available, otherwise default id
  const userId = pl.userId || pl.user || '1';
  const token = jwt.sign({ id: String(userId) }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '1d' });

  const path = `/api/playlists/${pl._id}/songs`;
  const body = JSON.stringify({ songId: String(song._id) });

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
      process.exit(0);
    });
  });

  req.on('error', (e) => { console.error('Request error', e); process.exit(1); });
  req.write(body);
  req.end();
};

run();
