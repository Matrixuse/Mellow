const cloudinary = require('cloudinary').v2;
const db = require('../database');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function updateSongTitles() {
    try {
        console.log('🔍 Updating song titles and artists...');
        
        // Get all songs from database
        const songs = await new Promise((resolve, reject) => {
            db.all('SELECT id, title, artist, songUrl FROM songs WHERE title = "Unknown Song"', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📊 Found ${songs.length} songs to update`);

        let updatedCount = 0;

        for (const song of songs) {
            try {
                // Extract public_id from URL
                const urlParts = song.songUrl.split('/');
                const filename = urlParts[urlParts.length - 1];
                const publicId = `music_app_songs/${filename.replace('.mp3', '')}`;

                // Get asset details from Cloudinary
                const asset = await cloudinary.api.resource(publicId, { resource_type: 'video' });
                
                // Extract title and artist from filename or context
                const { title, artist } = extractTitleAndArtist(asset.original_filename || filename);

                // Update database
                await new Promise((resolve, reject) => {
                    const sql = 'UPDATE songs SET title = ?, artist = ? WHERE id = ?';
                    db.run(sql, [title, JSON.stringify(artist), song.id], function(err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                console.log(`✅ Updated: ${title} - ${artist.join(', ')}`);
                updatedCount++;

            } catch (error) {
                console.log(`⚠️  Could not update song ID ${song.id}: ${error.message}`);
            }
        }

        console.log(`\n🎉 Update completed!`);
        console.log(`✅ Updated: ${updatedCount} songs`);

    } catch (error) {
        console.error('❌ Error updating songs:', error);
    }
}

function extractTitleAndArtist(filename) {
    if (!filename) {
        return { title: 'Unknown Song', artist: ['Unknown Artist'] };
    }
    
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    
    // Common patterns for song titles
    const patterns = [
        // "Artist - Song Title"
        /^(.+?)\s*-\s*(.+)$/,
        // "Song Title by Artist"
        /^(.+?)\s+by\s+(.+)$/i,
        // "Artist_Song_Title" or "Artist Song Title"
        /^(.+?)[_\s]+(.+)$/
    ];
    
    for (const pattern of patterns) {
        const match = nameWithoutExt.match(pattern);
        if (match) {
            const artist = match[1].trim().replace(/[_-]/g, ' ');
            const title = match[2].trim().replace(/[_-]/g, ' ');
            return { 
                title: title || 'Unknown Song', 
                artist: [artist || 'Unknown Artist'] 
            };
        }
    }
    
    // If no pattern matches, try to clean up the filename
    const cleaned = nameWithoutExt.replace(/[_-]/g, ' ').trim();
    return { 
        title: cleaned || 'Unknown Song', 
        artist: ['Unknown Artist'] 
    };
}

// Run the update
updateSongTitles().then(() => {
    console.log('\n🏁 Script completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});

