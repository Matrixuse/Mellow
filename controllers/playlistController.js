const db = require('../database');
let Playlist = null;
let Song = null;
try {
    if (process.env.MONGO_URI) {
        Playlist = require('../models/Playlist');
        Song = require('../models/Song');
    }
} catch (e) {}

// Create a new playlist
const createPlaylist = async (req, res) => {
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Playlist name is required' });
    }

    // Use MongoDB if configured
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

    // Fallback to SQLite (should be removed later)
    const sql = `INSERT INTO playlists (name, description, userId, isPublic) 
                 VALUES (?, ?, ?, ?)`;
    db.run(sql, [name.trim(), description || '', userId, isPublic ? 1 : 0], function(err) {
        if (err) {
            console.error('Error creating playlist:', err);
            return res.status(500).json({ message: 'Failed to create playlist' });
        }

        res.status(201).json({
            id: this.lastID,
            name: name.trim(),
            description: description || '',
            userId,
            isPublic: isPublic || false,
            createdAt: new Date().toISOString(),
            songCount: 0
        });
    });
};

// Get all playlists for the current user
const getUserPlaylists = async (req, res) => {
    const userId = req.user.id;

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

    // Fallback to SQLite
    const sql = `
        SELECT p.*, 
               COUNT(ps.songId) as songCount,
               s.coverUrl as coverUrl
        FROM playlists p
        LEFT JOIN playlist_songs ps ON p.id = ps.playlistId
        LEFT JOIN songs s ON ps.songId = s.id AND ps.position = 1
        WHERE p.userId = ?
        GROUP BY p.id
        ORDER BY p.updatedAt DESC
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching playlists:', err);
            return res.status(500).json({ message: 'Failed to fetch playlists' });
        }

        const playlists = rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            isPublic: row.isPublic === 1,
            songCount: row.songCount || 0,
            coverUrl: row.coverUrl || null,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }));

        res.json(playlists);
    });
};

// Get playlist by ID with songs
const getPlaylistById = async (req, res) => {
    const playlistId = req.params.id;
    const userId = req.user.id;

    // First, fetch the playlist and decide access based on ownership or public flag
    const checkSql = 'SELECT * FROM playlists WHERE id = ?';
    db.get(checkSql, [playlistId], (err, playlist) => {
        if (err) {
            console.error('Error checking playlist access:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        // If playlist is not public and the requesting user is not the owner, deny access
        const isOwner = Number(playlist.userId) === Number(userId);
        const isPublic = playlist.isPublic === 1 || playlist.isPublic === true;
        if (!isOwner && !isPublic) {
            return res.status(403).json({ message: 'Forbidden: you do not have access to this playlist' });
        }

        // Get playlist songs with details
        const songsSql = `
            SELECT s.*, ps.position, ps.addedAt
            FROM playlist_songs ps
            JOIN songs s ON ps.songId = s.id
            WHERE ps.playlistId = ?
            ORDER BY ps.position
        `;

        db.all(songsSql, [playlistId], (err, songs) => {
            if (err) {
                console.error('Error fetching playlist songs:', err);
                return res.status(500).json({ message: 'Failed to fetch playlist songs' });
            }

            // Parse artist and moods for each song
            const songsWithParsedData = songs.map(song => {
                let artist = [song.artist];
                let moods = [];
                
                try {
                    artist = JSON.parse(song.artist);
                    moods = song.moods ? JSON.parse(song.moods) : [];
                } catch (e) {
                    // Keep original values if parsing fails
                }

                return {
                    ...song,
                    artist: Array.isArray(artist) ? artist : [song.artist],
                    moods: Array.isArray(moods) ? moods : []
                };
            });

            res.json({
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                isPublic: playlist.isPublic === 1,
                coverUrl: playlist.coverUrl,
                createdAt: playlist.createdAt,
                updatedAt: playlist.updatedAt,
                songs: songsWithParsedData,
                songCount: songsWithParsedData.length
            });
        });
    });
};

// Update playlist
const updatePlaylist = async (req, res) => {
    const playlistId = req.params.id;
    const userId = req.user.id;
    const { name, description, isPublic } = req.body;

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

    // Check if playlist belongs to user
    db.get('SELECT id FROM playlists WHERE id = ? AND userId = ?', [playlistId, userId], (err, playlist) => {
        if (err) {
            console.error('Error checking playlist access:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        // Check if song exists
        db.get('SELECT id FROM songs WHERE id = ?', [songId], (err, song) => {
            if (err) {
                console.error('Error checking song:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (!song) {
                return res.status(404).json({ message: 'Song not found' });
            }

            // Get next position in playlist
            db.get('SELECT MAX(position) as maxPos FROM playlist_songs WHERE playlistId = ?', [playlistId], (err, result) => {
                if (err) {
                    console.error('Error getting next position:', err);
                    return res.status(500).json({ message: 'Database error' });
                }

                const nextPosition = (result.maxPos || 0) + 1;

                // Add song to playlist
                const insertSql = 'INSERT INTO playlist_songs (playlistId, songId, position) VALUES (?, ?, ?)';
                db.run(insertSql, [playlistId, songId, nextPosition], function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            return res.status(400).json({ message: 'Song already exists in playlist' });
                        }
                        console.error('Error adding song to playlist:', err);
                        return res.status(500).json({ message: 'Failed to add song to playlist' });
                    }

                    // Update playlist timestamp
                    db.run('UPDATE playlists SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [playlistId]);

                    console.log(`Added song ${songId} to playlist ${playlistId} at position ${nextPosition} for user ${userId}`);
                    res.status(201).json({ message: 'Song added to playlist successfully', position: nextPosition });
                });
            });
        });
    });
};

// Remove song from playlist
const removeSongFromPlaylist = async (req, res) => {
    const playlistId = req.params.id;
    const songId = req.params.songId;
    const userId = req.user.id;

    // Check if playlist belongs to user
    db.get('SELECT id FROM playlists WHERE id = ? AND userId = ?', [playlistId, userId], (err, playlist) => {
        if (err) {
            console.error('Error checking playlist access:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        const sql = 'DELETE FROM playlist_songs WHERE playlistId = ? AND songId = ?';
        db.run(sql, [playlistId, songId], function(err) {
            if (err) {
                console.error('Error removing song from playlist:', err);
                return res.status(500).json({ message: 'Failed to remove song from playlist' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ message: 'Song not found in playlist' });
            }

            // Update playlist timestamp
            db.run('UPDATE playlists SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [playlistId]);

            res.json({ message: 'Song removed from playlist successfully' });
        });
    });
};

// Reorder songs in playlist
const reorderPlaylistSongs = async (req, res) => {
    const playlistId = req.params.id;
    const userId = req.user.id;
    const { songIds } = req.body; // Array of song IDs in new order

    if (!Array.isArray(songIds)) {
        return res.status(400).json({ message: 'songIds must be an array' });
    }

    // Check if playlist belongs to user
    db.get('SELECT id FROM playlists WHERE id = ? AND userId = ?', [playlistId, userId], (err, playlist) => {
        if (err) {
            console.error('Error checking playlist access:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        // Begin transaction
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Update positions for each song
            songIds.forEach((songId, index) => {
                const position = index + 1;
                db.run('UPDATE playlist_songs SET position = ? WHERE playlistId = ? AND songId = ?', 
                       [position, playlistId, songId]);
            });

            // Update playlist timestamp
            db.run('UPDATE playlists SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [playlistId]);

            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Error reordering playlist songs:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ message: 'Failed to reorder playlist songs' });
                }

                res.json({ message: 'Playlist songs reordered successfully' });
            });
        });
    });
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
