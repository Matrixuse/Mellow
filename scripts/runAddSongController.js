const connectMongo = require('../config/mongo');
const controller = require('../controllers/playlistController');

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

  const req = {
    params: { id: pl._id },
    body: { songId: song._id },
    user: { id: pl.userId || pl.user || null }
  };

  const res = {
    status(code) { this.statusCode = code; return this; },
    json(obj) { console.log('JSON response', this.statusCode || 200, obj); },
    send(obj) { console.log('Send response', this.statusCode || 200, obj); }
  };

  console.log('Calling addSongToPlaylist with', { playlistId: pl._id, songId: song._id });
  await controller.addSongToPlaylist(req, res);
  process.exit(0);
};

run();
