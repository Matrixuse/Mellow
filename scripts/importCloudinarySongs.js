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

async function importMissingSongs() {
    try {
        console.log('🔍 Fetching all assets from Cloudinary...');
        
        // Get all assets from Cloudinary
        const result = await cloudinary.api.resources({
            resource_type: 'video',
            folder: 'music_app_songs',
            max_results: 500
        });

        console.log(`📊 Found ${result.resources.length} songs in Cloudinary`);

        // Get existing songs from database
        const existingSongs = await new Promise((resolve, reject) => {
            db.all('SELECT songUrl FROM songs', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.songUrl));
            });
        });

        console.log(`📊 Found ${existingSongs.length} songs in database`);

        let importedCount = 0;
        let skippedCount = 0;

        for (const asset of result.resources) {
            // Check if song already exists in database
            if (existingSongs.includes(asset.secure_url)) {
                skippedCount++;
                continue;
            }

            // Try to find corresponding cover image
            const coverUrl = await findCoverImage(asset.public_id);
            
            // Extract title and artist from filename or use defaults
            const title = extractTitleFromFilename(asset.original_filename);
            const artist = ['Unknown Artist']; // Default artist

            // Insert into database
            await new Promise((resolve, reject) => {
                const sql = 'INSERT INTO songs (title, artist, songUrl, coverUrl) VALUES (?, ?, ?, ?)';
                db.run(sql, [title, JSON.stringify(artist), asset.secure_url, coverUrl], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`✅ Imported: ${title}`);
            importedCount++;
        }

        console.log(`\n🎉 Import completed!`);
        console.log(`✅ Imported: ${importedCount} songs`);
        console.log(`⏭️  Skipped: ${skippedCount} songs (already in database)`);

    } catch (error) {
        console.error('❌ Error importing songs:', error);
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

function extractTitleFromFilename(filename) {
    if (!filename) return 'Unknown Song';
    
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    
    // Try to extract title from common patterns
    if (nameWithoutExt.includes(' - ')) {
        const parts = nameWithoutExt.split(' - ');
        return parts[parts.length - 1].trim(); // Last part is usually the title
    }
    
    if (nameWithoutExt.includes('_')) {
        return nameWithoutExt.replace(/_/g, ' ');
    }
    
    return nameWithoutExt;
}

// Run the import
importMissingSongs().then(() => {
    console.log('\n🏁 Script completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
});
