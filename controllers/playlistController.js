let Playlist = null;
let Song = null;
try {
    // Prefer Mongoose models. If Mongo is not configured, we will return
    // an explicit error instead of attempting to use the removed SQLite shim.
    Playlist = require('../models/Playlist');
    Song = require('../models/Song');
} catch (e) {
    // models not available (likely Mongo not configured)
    Playlist = null;
    Song = null;
}

function requireMongoOrFail(res) {
    if (!Playlist || !Song) {
        return res.status(500).json({ message: 'Server not configured for MongoDB. Please set MONGO_URI and restart.' });
    }
    return null;
}

// Create a new playlist
const createPlaylist = async (req, res) => {
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Playlist name is required' });
    }

    // Ensure Mongo is configured
    if (requireMongoOrFail(res)) return;

    // Use MongoDB
    if (Playlist) {
        try {
            const pl = await Playlist.create({
                name: name.trim(),
                description: description || '',
                userId,
                isPublic: !!isPublic,
                songs: []
            });
            return res.status(201).json({
                id: pl._id,
                name: pl.name,
                description: pl.description,
                userId: pl.userId,
                isPublic: pl.isPublic,
                createdAt: pl.createdAt,
                songCount: 0
            });
        } catch (err) {
            console.error('Error creating playlist (Mongo):', err);
            return res.status(500).json({ message: 'Failed to create playlist' });
        }
    }

    // No SQLite fallback: we require MongoDB in production.
    return res.status(500).json({ message: 'Server not configured for SQLite fallback. Use MongoDB.' });
};

// Get all playlists for the current user
const getUserPlaylists = async (req, res) => {
    const userId = req.user.id;
    if (requireMongoOrFail(res)) return;

    if (Playlist) {
        try {
            const playlists = await Playlist.find({ userId }).sort({ updatedAt: -1 }).populate({ path: 'songs.song', select: 'coverUrl' }).lean();
            const mapped = playlists.map(pl => ({
                id: pl._id,
                name: pl.name,
                description: pl.description,
                isPublic: !!pl.isPublic,
                songCount: (pl.songs || []).length,
                coverUrl: pl.songs && pl.songs.length ? (pl.songs[0].song ? pl.songs[0].song.coverUrl : null) : null,
                createdAt: pl.createdAt,
                updatedAt: pl.updatedAt
            }));
            return res.json(mapped);
        } catch (err) {
            console.error('Error fetching playlists (Mongo):', err);
            return res.status(500).json({ message: 'Failed to fetch playlists' });
        }
    }

    // No SQLite fallback available in this deployment.
    return res.status(500).json({ message: 'Server not configured for SQLite fallback. Use MongoDB.' });
};

// Get playlist by ID with songs
const getPlaylistById = async (req, res) => {
    const playlistId = req.params.id;
    const userId = req.user.id;
    if (requireMongoOrFail(res)) return;

    // Using MongoDB
    if (Playlist) {
        try {
            const pl = await Playlist.findById(playlistId).populate({ path: 'songs.song' }).lean();
            if (!pl) return res.status(404).json({ message: 'Playlist not found' });

            const isOwner = String(pl.userId) === String(userId);
            const isPublic = !!pl.isPublic;
            if (!isOwner && !isPublic) {
                return res.status(403).json({ message: 'Forbidden: you do not have access to this playlist' });
            }

            // Map songs into expected shape (parse artist/moods similar to SQLite path)
            const songsWithParsedData = (pl.songs || []).map(item => {
                const song = item.song || {};
                let artist = song.artist;
                let moods = song.moods;
                try {
                    if (typeof artist === 'string') artist = JSON.parse(artist);
                } catch (e) { artist = song.artist; }
                try {
                    if (typeof moods === 'string') moods = JSON.parse(moods);
                } catch (e) { moods = song.moods; }

                return Object.assign({}, song, {
                    artist: Array.isArray(artist) ? artist : (artist ? [artist] : []),
                    moods: Array.isArray(moods) ? moods : (moods ? [moods] : []),
                    position: item.position || null,
                    addedAt: item.addedAt || null
                });
            });

            return res.json({
                id: pl._id,
                name: pl.name,
                description: pl.description,
                isPublic: !!pl.isPublic,
                coverUrl: pl.coverUrl,
                createdAt: pl.createdAt,
                updatedAt: pl.updatedAt,
                songs: songsWithParsedData,
                songCount: songsWithParsedData.length
            });
        } catch (err) {
            console.error('Error fetching playlist (Mongo):', err);
            return res.status(500).json({ message: 'Failed to fetch playlist' });
        }
    }

    // No SQLite fallback in production deployment.
    return res.status(500).json({ message: 'Server not configured for SQLite fallback. Use MongoDB.' });
};

// Update playlist
const updatePlaylist = async (req, res) => {
    const playlistId = req.params.id;
    const userId = req.user.id;
    const { name, description, isPublic } = req.body;
    if (requireMongoOrFail(res)) return;

    // Mongo implementation
    if (Playlist) {
        try {
            const updated = await Playlist.findOneAndUpdate(
                { _id: playlistId, userId: userId },
                { name: name, description: description || '', isPublic: !!isPublic, updatedAt: Date.now() },
                { new: true }
            );
            if (!updated) return res.status(404).json({ message: 'Playlist not found' });
            return res.json({ message: 'Playlist updated successfully' });
        } catch (err) {
            console.error('Error updating playlist (Mongo):', err);
            return res.status(500).json({ message: 'Failed to update playlist' });
        }
    }

    const sql = `
        UPDATE playlists 
        SET name = ?, description = ?, isPublic = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ? AND userId = ?
    `;

    db.run(sql, [name, description || '', isPublic ? 1 : 0, playlistId, userId], function(err) {
        if (err) {
            console.error('Error updating playlist:', err);
            return res.status(500).json({ message: 'Failed to update playlist' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        res.json({ message: 'Playlist updated successfully' });
    });
};

// Delete playlist
const deletePlaylist = async (req, res) => {
    const playlistId = req.params.id;
    const userId = req.user.id;
    // If using MongoDB, delete using the Playlist model
    if (Playlist) {
        try {
            const deleted = await Playlist.findOneAndDelete({ _id: playlistId, userId: userId });
            if (!deleted) return res.status(404).json({ message: 'Playlist not found' });
            return res.json({ message: 'Playlist deleted successfully' });
        } catch (err) {
            console.error('Error deleting playlist (Mongo):', err);
            return res.status(500).json({ message: 'Failed to delete playlist' });
        }
    }

    const sql = 'DELETE FROM playlists WHERE id = ? AND userId = ?';
    
    db.run(sql, [playlistId, userId], function(err) {
        if (err) {
            console.error('Error deleting playlist:', err);
            return res.status(500).json({ message: 'Failed to delete playlist' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        res.json({ message: 'Playlist deleted successfully' });
    });
};

// Add song to playlist
const addSongToPlaylist = async (req, res) => {
    const playlistId = req.params.id;
    const userId = req.user.id;
    const { songId } = req.body;

    if (!songId) {
        return res.status(400).json({ message: 'Song ID is required' });
    }

    // Mongo implementation
    if (Playlist) {
        try {
            const pl = await Playlist.findOne({ _id: playlistId, userId });
            if (!pl) return res.status(404).json({ message: 'Playlist not found' });

            // Validate song exists
            const song = await Song.findById(songId).lean();
            if (!song) return res.status(404).json({ message: 'Song not found' });

            // Check if already present
            const exists = pl.songs && pl.songs.some(s => String(s.song) === String(songId));
            if (exists) return res.status(400).json({ message: 'Song already exists in playlist' });

            const nextPosition = (pl.songs ? pl.songs.length : 0) + 1;
            pl.songs.push({ song: song._id, position: nextPosition, addedAt: new Date() });
            pl.updatedAt = Date.now();
            await pl.save();

            console.log(`Added song ${songId} to playlist ${playlistId} at position ${nextPosition} for user ${userId}`);
            return res.status(201).json({ message: 'Song added to playlist successfully', position: nextPosition });
        } catch (err) {
            console.error('Error adding song to playlist (Mongo):', err);
            return res.status(500).json({ message: 'Failed to add song to playlist' });
        }
    }

    return res.status(500).json({ message: 'Server not configured for SQLite fallback. Use MongoDB.' });
};

// Remove song from playlist
const removeSongFromPlaylist = async (req, res) => {
    const playlistId = req.params.id;
    const songId = req.params.songId;
    const userId = req.user.id;
    if (requireMongoOrFail(res)) return;

    // Mongo implementation
    if (Playlist) {
        try {
            const pl = await Playlist.findOne({ _id: playlistId, userId });
            if (!pl) return res.status(404).json({ message: 'Playlist not found' });

            const idx = (pl.songs || []).findIndex(s => String(s.song) === String(songId));
            if (idx === -1) return res.status(404).json({ message: 'Song not found in playlist' });

            // remove and reindex positions
            pl.songs.splice(idx, 1);
            pl.songs = pl.songs.map((it, i) => ({ ...it.toObject ? it.toObject() : it, position: i + 1 }));
            pl.updatedAt = Date.now();
            await pl.save();

            return res.json({ message: 'Song removed from playlist successfully' });
        } catch (err) {
            console.error('Error removing song from playlist (Mongo):', err);
            return res.status(500).json({ message: 'Failed to remove song from playlist' });
        }
    }

    return res.status(500).json({ message: 'Server not configured for SQLite fallback. Use MongoDB.' });
};

// Reorder songs in playlist
const reorderPlaylistSongs = async (req, res) => {
    const playlistId = req.params.id;
    const userId = req.user.id;
    const { songIds } = req.body; // Array of song IDs in new order

    if (!Array.isArray(songIds)) {
        return res.status(400).json({ message: 'songIds must be an array' });
    }

    if (requireMongoOrFail(res)) return;

    // Mongo implementation
    if (Playlist) {
        try {
            const pl = await Playlist.findOne({ _id: playlistId, userId });
            if (!pl) return res.status(404).json({ message: 'Playlist not found' });

            // Build a map for existing songs
            const existing = (pl.songs || []).reduce((m, it) => { m[String(it.song)] = it; return m; }, {});

            // Recompose songs array based on provided songIds, preserving addedAt when possible
            const newSongs = songIds.map((sid, idx) => {
                const existingItem = existing[String(sid)];
                return {
                    song: existingItem ? existingItem.song : sid,
                    position: idx + 1,
                    addedAt: existingItem ? existingItem.addedAt : new Date()
                };
            });

            pl.songs = newSongs;
            pl.updatedAt = Date.now();
            await pl.save();

            return res.json({ message: 'Playlist songs reordered successfully' });
        } catch (err) {
            console.error('Error reordering playlist songs (Mongo):', err);
            return res.status(500).json({ message: 'Failed to reorder playlist songs' });
        }
    }

    return res.status(500).json({ message: 'Server not configured for SQLite fallback. Use MongoDB.' });
};

module.exports = {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    reorderPlaylistSongs
};
