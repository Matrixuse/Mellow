const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: [String], default: [], required: true },
  songUrl: { type: String, required: true },
  coverUrl: { type: String, required: true },
  moods: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Song || mongoose.model('Song', SongSchema);
