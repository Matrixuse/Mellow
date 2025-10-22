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

async function extractSongInfoFromCloudinary() {
    try {
        console.log('🔍 Fetching detailed metadata from Cloudinary...');
        
        // Get all songs from database that have hash names
        const songs = await new Promise((resolve, reject) => {
            db.all('SELECT id, title, songUrl FROM songs WHERE title LIKE "%Unknown Song%" OR title LIKE "%bow%" OR title LIKE "%tfl%" OR title LIKE "%ptr%"', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📊 Found ${songs.length} songs with hash names to process`);

        let updatedCount = 0;

        for (const song of songs) {
            try {
                // Extract public_id from URL
                const urlParts = song.songUrl.split('/');
                const filename = urlParts[urlParts.length - 1];
                const publicId = `music_app_songs/${filename.replace('.mp3', '')}`;

                // Get detailed asset information from Cloudinary
                const asset = await cloudinary.api.resource(publicId, { 
                    resource_type: 'video',
                    context: true,
                    tags: true
                });
                
                console.log(`\n🔍 Processing: ${publicId}`);
                console.log(`   Original filename: ${asset.original_filename || 'N/A'}`);
                console.log(`   Context: ${JSON.stringify(asset.context || {})}`);
                console.log(`   Tags: ${JSON.stringify(asset.tags || [])}`);
                console.log(`   Format: ${asset.format}`);
                console.log(`   Duration: ${asset.duration}s`);

                // Try to extract title and artist from various sources
                const { title, artist } = extractSongInfo(asset);

                // Update database
                await new Promise((resolve, reject) => {
                    const sql = 'UPDATE songs SET title = ?, artist = ? WHERE id = ?';
                    db.run(sql, [title, JSON.stringify(artist), song.id], function(err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                console.log(`✅ Updated: "${title}" by ${artist.join(', ')}`);
                updatedCount++;

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.log(`⚠️  Could not process song ID ${song.id}: ${error.message}`);
            }
        }

        console.log(`\n🎉 Processing completed!`);
        console.log(`✅ Updated: ${updatedCount} songs`);

    } catch (error) {
        console.error('❌ Error processing songs:', error);
    }
}

function extractSongInfo(asset) {
    let title = 'Unknown Song';
    let artist = ['Unknown Artist'];

    // Try to get info from context first
    if (asset.context && asset.context.custom) {
        if (asset.context.custom.title) {
            title = asset.context.custom.title;
        }
        if (asset.context.custom.artist) {
            artist = [asset.context.custom.artist];
        }
    }

    // Try to get info from tags
    if (asset.tags && asset.tags.length > 0) {
        for (const tag of asset.tags) {
            if (tag.includes('title:')) {
                title = tag.replace('title:', '').trim();
            }
            if (tag.includes('artist:')) {
                artist = [tag.replace('artist:', '').trim()];
            }
        }
    }

    // Try to extract from original filename if available
    if (asset.original_filename && asset.original_filename !== title) {
        const filenameInfo = parseFilename(asset.original_filename);
        if (filenameInfo.title !== 'Unknown Song') {
            title = filenameInfo.title;
        }
        if (filenameInfo.artist[0] !== 'Unknown Artist') {
            artist = filenameInfo.artist;
        }
    }

    // If still unknown, try to generate a meaningful name based on duration or other metadata
    if (title === 'Unknown Song' && asset.duration) {
        title = `Song ${Math.round(asset.duration)}s`;
    }

    return { title, artist };
}

function parseFilename(filename) {
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

// Run the extraction
extractSongInfoFromCloudinary().then(() => {
    console.log('\n🏁 Script completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
