const mongoose = require('mongoose');

const PlaylistSongSchema = new mongoose.Schema({
  song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true },
  position: { type: Number, required: true },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

const PlaylistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  coverUrl: { type: String, default: null },
  songs: { type: [PlaylistSongSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.models.Playlist || mongoose.model('Playlist', PlaylistSchema);
