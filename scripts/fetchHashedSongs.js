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

// Function to find matching cover for a song
async function findMatchingCover(songPublicId) {
    try {
        // Extract the hash part from the song public ID
        const songHash = songPublicId.replace('music_app_songs/', '');
        
        // Search for covers with the same hash
        const covers = await cloudinary.api.resources({
            type: 'upload',
            resource_type: 'image',
            prefix: 'music_app_covers/',
            max_results: 100
        });
        
        // Find cover with matching hash
        const matchingCover = covers.resources.find(cover => {
            const coverHash = cover.public_id.replace('music_app_covers/', '');
            return coverHash === songHash;
        });
        
        return matchingCover ? matchingCover.secure_url : null;
    } catch (error) {
        console.error(`Error finding cover for ${songPublicId}:`, error.message);
        return null;
    }
}

// Main function to fetch and add hashed songs
async function fetchHashedSongs() {
    try {
        console.log('🎵 Fetching hashed songs from Cloudinary...');
        console.log('=' .repeat(60));
        
        // Get all songs from Cloudinary
        const songsResult = await cloudinary.api.resources({
            type: 'upload',
            resource_type: 'video',
            prefix: 'music_app_songs/',
            max_results: 100
        });
        
        if (!songsResult.resources || songsResult.resources.length === 0) {
            console.log('❌ No songs found in Cloudinary');
            return;
        }
        
        console.log(`📊 Found ${songsResult.resources.length} songs to process`);
        
        let addedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const cloudinarySong of songsResult.resources) {
            try {
                const songUrl = cloudinarySong.secure_url;
                const songHash = cloudinarySong.public_id.replace('music_app_songs/', '');
                
                // Use hash as title for now (you can rename later)
                const title = `Song ${songHash.substring(0, 8)}`;
                const artist = 'Unknown Artist';
                
                // Find matching cover
                const coverUrl = await findMatchingCover(cloudinarySong.public_id);
                
                // Convert artist to JSON array format
                const artistsArray = [artist];
                const artistsJsonString = JSON.stringify(artistsArray);
                
                // Check if song already exists in database
                db.get('SELECT id FROM songs WHERE songUrl = ?', [songUrl], (err, existingSong) => {
                    if (err) {
                        console.error(`Database error for ${title}:`, err.message);
                        errorCount++;
                        return;
                    }
                    
                    if (existingSong) {
                        // Update existing song
                        const updateSql = 'UPDATE songs SET title = ?, artist = ?, coverUrl = ? WHERE songUrl = ?';
                        db.run(updateSql, [title, artistsJsonString, coverUrl || '', songUrl], function(updateErr) {
                            if (updateErr) {
                                console.error(`Error updating ${title}:`, updateErr.message);
                                errorCount++;
                            } else {
                                console.log(`✅ Updated: ${title}`);
                                updatedCount++;
                            }
                        });
                    } else {
                        // Insert new song
                        const insertSql = 'INSERT INTO songs (title, artist, songUrl, coverUrl) VALUES (?, ?, ?, ?)';
                        db.run(insertSql, [title, artistsJsonString, songUrl, coverUrl || ''], function(insertErr) {
                            if (insertErr) {
                                console.error(`Error inserting ${title}:`, insertErr.message);
                                errorCount++;
                            } else {
                                console.log(`🆕 Added: ${title}`);
                                addedCount++;
                            }
                        });
                    }
                });
                
                // Small delay to avoid overwhelming the database
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.error(`Error processing song:`, error.message);
                errorCount++;
            }
        }
        
        // Wait for all database operations to complete
        setTimeout(() => {
            console.log('\n📈 Summary:');
            console.log(`✅ Updated songs: ${updatedCount}`);
            console.log(`🆕 New songs added: ${addedCount}`);
            console.log(`❌ Errors: ${errorCount}`);
            console.log(`📊 Total processed: ${songsResult.resources.length}`);
            
            if (addedCount > 0 || updatedCount > 0) {
                console.log('\n🎉 Songs have been added to your database!');
                console.log('💡 You can now:');
                console.log('1. Refresh your app to see the songs');
                console.log('2. Rename the files in Cloudinary dashboard');
                console.log('3. Run the fetch script again to update titles');
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Error fetching songs from Cloudinary:', error.message);
        console.error('Full error:', error);
    }
}

// Run the script
fetchHashedSongs();
