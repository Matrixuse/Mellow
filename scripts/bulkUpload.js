const cloudinary = require('cloudinary').v2;
const db = require('../database');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function bulkUploadSongs(songsDirectory, coversDirectory) {
    try {
        console.log('🎵 Bulk Upload Tool - Using App\'s Upload Process');
        console.log('=' .repeat(60));
        
        if (!fs.existsSync(songsDirectory)) {
            console.error(`❌ Songs directory not found: ${songsDirectory}`);
            return;
        }
        
        if (!fs.existsSync(coversDirectory)) {
            console.error(`❌ Covers directory not found: ${coversDirectory}`);
            return;
        }

        const songFiles = fs.readdirSync(songsDirectory).filter(file => 
            file.toLowerCase().endsWith('.mp3') || file.toLowerCase().endsWith('.wav')
        );

        console.log(`📊 Found ${songFiles.length} songs to upload`);

        let uploadedCount = 0;
        let skippedCount = 0;

        for (const songFile of songFiles) {
            try {
                const songPath = path.join(songsDirectory, songFile);
                const baseName = path.parse(songFile).name;
                
                // Look for corresponding cover image
                const coverExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
                let coverPath = null;
                
                for (const ext of coverExtensions) {
                    const coverFile = baseName + ext;
                    const fullCoverPath = path.join(coversDirectory, coverFile);
                    if (fs.existsSync(fullCoverPath)) {
                        coverPath = fullCoverPath;
                        break;
                    }
                }

                if (!coverPath) {
                    console.log(`⚠️  No cover found for ${songFile}, skipping...`);
                    skippedCount++;
                    continue;
                }

                // Extract title and artist from filename
                const { title, artist } = extractSongInfo(songFile);

                // Upload to Cloudinary
                const [songUploadResult, coverUploadResult] = await Promise.all([
                    uploadFileToCloudinary(songPath, { resource_type: 'video', folder: 'music_app_songs' }),
                    uploadFileToCloudinary(coverPath, { resource_type: 'image', folder: 'music_app_covers' })
                ]);

                // Save to database (same as your app's process)
                await new Promise((resolve, reject) => {
                    const sql = 'INSERT INTO songs (title, artist, songUrl, coverUrl) VALUES (?, ?, ?, ?)';
                    const artistsJsonString = JSON.stringify(artist);
                    db.run(sql, [title, artistsJsonString, songUploadResult.secure_url, coverUploadResult.secure_url], function(err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                console.log(`✅ Uploaded: "${title}" by ${artist.join(', ')}`);
                uploadedCount++;

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.log(`❌ Failed to upload ${songFile}: ${error.message}`);
                skippedCount++;
            }
        }

        console.log(`\n🎉 Bulk upload completed!`);
        console.log(`✅ Uploaded: ${uploadedCount} songs`);
        console.log(`⏭️  Skipped: ${skippedCount} songs`);

    } catch (error) {
        console.error('❌ Error during bulk upload:', error);
    }
}

async function uploadFileToCloudinary(filePath, options) {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(filePath, options, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
    });
}

function extractSongInfo(filename) {
    const nameWithoutExt = path.parse(filename).name;
    
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
    
    // If no pattern matches, use filename as title
    const cleaned = nameWithoutExt.replace(/[_-]/g, ' ').trim();
    return { 
        title: cleaned || 'Unknown Song', 
        artist: ['Unknown Artist'] 
    };
}

// Example usage:
// bulkUploadSongs('./songs', './covers').then(() => {
//     console.log('Bulk upload completed');
//     process.exit(0);
// });

console.log('📋 Bulk Upload Tool Created');
console.log('💡 To use this tool:');
console.log('1. Create folders: ./songs and ./covers');
console.log('2. Put your MP3 files in ./songs');
console.log('3. Put corresponding cover images in ./covers');
console.log('4. Run: node scripts/bulkUpload.js');
console.log('5. This will upload using your app\'s process (Cloudinary + Database)');

module.exports = { bulkUploadSongs };
