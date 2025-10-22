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

async function syncSongsFromDeployedServer() {
    try {
        console.log('🔄 Syncing songs from deployed server to local database...');
        console.log('=' .repeat(60));
        
        // Get all assets from Cloudinary (these are the songs uploaded via admin panel)
        const result = await cloudinary.api.resources({
            resource_type: 'video',
            folder: 'music_app_songs',
            max_results: 500
        });

        console.log(`📊 Found ${result.resources.length} songs in Cloudinary`);

        // Get existing songs from local database
        const existingSongs = await new Promise((resolve, reject) => {
            db.all('SELECT songUrl FROM songs', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.songUrl));
            });
        });

        console.log(`📊 Found ${existingSongs.length} songs in local database`);

        let importedCount = 0;
        let skippedCount = 0;

        for (const asset of result.resources) {
            // Check if song already exists in local database
            if (existingSongs.includes(asset.secure_url)) {
                skippedCount++;
                continue;
            }

            // Try to find corresponding cover image
            const coverUrl = await findCoverImage(asset.public_id);
            
            // For admin panel uploads, we need to extract title and artist from Cloudinary metadata
            // or use the context/tags if they were set
            const { title, artist } = extractSongInfoFromAsset(asset);

            // Insert into local database
            await new Promise((resolve, reject) => {
                const sql = 'INSERT INTO songs (title, artist, songUrl, coverUrl) VALUES (?, ?, ?, ?)';
                db.run(sql, [title, JSON.stringify(artist), asset.secure_url, coverUrl], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`✅ Imported: "${title}" by ${artist.join(', ')}`);
            importedCount++;
        }

        console.log(`\n🎉 Sync completed!`);
        console.log(`✅ Imported: ${importedCount} songs`);
        console.log(`⏭️  Skipped: ${skippedCount} songs (already in local database)`);

    } catch (error) {
        console.error('❌ Error syncing songs:', error);
    }
}

async function findCoverImage(songPublicId) {
    try {
        // Try to find cover with similar name in covers folder
        const coversResult = await cloudinary.api.resources({
            resource_type: 'image',
            folder: 'music_app_covers',
            max_results: 500
        });

        // Extract base name from song public_id
        const baseName = songPublicId.split('/').pop().split('.')[0];
        
        // Look for cover with similar name
        for (const cover of coversResult.resources) {
            const coverBaseName = cover.public_id.split('/').pop().split('.')[0];
            if (coverBaseName === baseName || coverBaseName.includes(baseName) || baseName.includes(coverBaseName)) {
                return cover.secure_url;
            }
        }

        // If no cover found, return default
        return 'https://placehold.co/400x400/1F2937/FFFFFF?text=Music';
    } catch (error) {
        console.log('⚠️  Could not find cover image, using default');
        return 'https://placehold.co/400x400/1F2937/FFFFFF?text=Music';
    }
}

function extractSongInfoFromAsset(asset) {
    let title = 'Unknown Song';
    let artist = ['Unknown Artist'];

    // Try to get info from context first (if admin panel set it)
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

    // If still unknown, generate a meaningful name
    if (title === 'Unknown Song') {
        const timestamp = new Date(asset.created_at).toLocaleDateString();
        title = `Admin Upload ${timestamp}`;
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
        /^(.+?)\s*-\s*(.+)$/,  // "Artist - Song Title"
        /^(.+?)\s+by\s+(.+)$/i,  // "Song Title by Artist"
        /^(.+?)[_\s]+(.+)$/  // "Artist_Song_Title" or "Artist Song Title"
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

// Run the sync
syncSongsFromDeployedServer().then(() => {
    console.log('\n🏁 Sync completed');
    console.log('\n💡 IMPORTANT: Your admin panel has been fixed!');
    console.log('Now it will upload to your LOCAL server instead of the deployed server.');
    console.log('Future uploads will work correctly.');
    process.exit(0);
}).catch(error => {
    console.error('💥 Sync failed:', error);
    process.exit(1);
});

