const cloudinary = require('cloudinary').v2;
const connectMongo = require('../config/mongo');
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

// Function to extract title and artist from filename
function extractMetadataFromFilename(filename) {
    // Remove file extension
    const nameWithoutExt = path.parse(filename).name;
    
    // Common patterns for song filenames:
    // "Artist - Title" or "Title - Artist" or just "Title"
    let title = nameWithoutExt;
    let artist = 'Unknown Artist';
    
    // Try "Artist - Title" pattern first
    if (nameWithoutExt.includes(' - ')) {
        const parts = nameWithoutExt.split(' - ');
        if (parts.length >= 2) {
            // Assume first part is artist, rest is title
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        }
    }
    
    // Clean up common issues
    title = title.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    artist = artist.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    
    return { title, artist };
}

// Function to find matching cover for a song
async function findMatchingCover(songFilename) {
    try {
        const songNameWithoutExt = path.parse(songFilename).name;
        
        // Search for covers in the music_app_covers folder
        const covers = await cloudinary.search
            .expression(`folder:music_app_covers AND filename:${songNameWithoutExt}*`)
            .execute();
            
        if (covers.resources && covers.resources.length > 0) {
            // Return the first matching cover
            return covers.resources[0].secure_url;
        }
        
        // If no exact match, try to find covers with similar names
        const allCovers = await cloudinary.search
            .expression('folder:music_app_covers')
            .execute();
            
        if (allCovers.resources) {
            // Look for covers that might match (fuzzy matching)
            const matchingCover = allCovers.resources.find(cover => {
                const coverName = path.parse(cover.filename).name.toLowerCase();
                const songName = songNameWithoutExt.toLowerCase();
                
                // Check if cover name contains song name or vice versa
                return coverName.includes(songName) || songName.includes(coverName) ||
                       coverName.replace(/[_-]/g, '').includes(songName.replace(/[_-]/g, '')) ||
                       songName.replace(/[_-]/g, '').includes(coverName.replace(/[_-]/g, ''));
            });
            
            if (matchingCover) {
                return matchingCover.secure_url;
            }
        }
        
        return null;
    } catch (error) {
        console.error(`Error finding cover for ${songFilename}:`, error.message);
        return null;
    }
}

// Main function to fetch and update songs
async function fetchAndUpdateCloudinarySongs() {
    try {
        console.log('🎵 Fetching songs from Cloudinary with updated metadata...');
        console.log('=' .repeat(60));
        
        // Fetch all songs from Cloudinary
        const songs = await cloudinary.search
            .expression('folder:music_app_songs')
            .sort_by([['created_at', 'desc']])
            .execute();
            
        if (!songs.resources || songs.resources.length === 0) {
            console.log('❌ No songs found in Cloudinary music_app_songs folder');
            return;
        }
        
        console.log(`📊 Found ${songs.resources.length} songs in Cloudinary`);
        
        let updatedCount = 0;
        let newCount = 0;
        let errorCount = 0;
        
        for (const cloudinarySong of songs.resources) {
            try {
                const { title, artist } = extractMetadataFromFilename(cloudinarySong.filename);
                const songUrl = cloudinarySong.secure_url;
                
                // Find matching cover
                const coverUrl = await findMatchingCover(cloudinarySong.filename);
                
                if (!coverUrl) {
                    console.log(`⚠️  No cover found for: ${cloudinarySong.filename}`);
                }
                
                // Convert artist to JSON array format (as expected by your app)
                const artistsArray = artist.split(',').map(name => name.trim()).filter(Boolean);
                const artistsJsonString = JSON.stringify(artistsArray);
                
                // Check if song already exists in MongoDB
                try {
                    const Song = require('../models/Song');
                    const existingSong = await Song.findOne({ songUrl }).exec();
                    if (existingSong) {
                        existingSong.title = title;
                        existingSong.artist = artist.split(',').map(n => n.trim()).filter(Boolean);
                        existingSong.coverUrl = coverUrl || '';
                        await existingSong.save();
                        console.log(`✅ Updated: ${title} by ${artist}`);
                        updatedCount++;
                    } else {
                        await Song.create({ title, artist: artist.split(',').map(n => n.trim()).filter(Boolean), songUrl, coverUrl: coverUrl || '' });
                        console.log(`🆕 Added: ${title} by ${artist}`);
                        newCount++;
                    }
                } catch (err) {
                    console.error(`Error updating/inserting ${title}:`, err && err.message ? err.message : err);
                    errorCount++;
                }
                
                // Small delay to avoid overwhelming Cloudinary API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`Error processing ${cloudinarySong.filename}:`, error.message);
                errorCount++;
            }
        }
        
        // Wait a bit for all database operations to complete
        setTimeout(() => {
            console.log('\n📈 Summary:');
            console.log(`✅ Updated songs: ${updatedCount}`);
            console.log(`🆕 New songs added: ${newCount}`);
            console.log(`❌ Errors: ${errorCount}`);
            console.log(`📊 Total processed: ${songs.resources.length}`);
            
            if (updatedCount > 0 || newCount > 0) {
                console.log('\n🎉 Songs have been fetched and updated in your database!');
                console.log('You can now refresh your app to see the updated song titles and artists.');
            }
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error fetching songs from Cloudinary:', error.message);
    }
}

// Function to show current database songs (for comparison)
async function showCurrentDatabaseSongs() {
    console.log('\n📋 Current songs in database:');
    console.log('='.repeat(60));
    
    try {
        const Song = require('../models/Song');
        const rows = await Song.find({}).sort({ createdAt: 1 }).lean();
        if (!rows || rows.length === 0) {
            console.log('No songs found in database.');
            return;
        }

        rows.forEach((song, index) => {
            const artistString = Array.isArray(song.artist) ? song.artist.join(', ') : (song.artist || 'Unknown');
            console.log(`${index + 1}. ${song.title} by ${artistString}`);
        });

        console.log(`\nTotal songs in database: ${rows.length}`);
    } catch (err) {
        console.error('Error fetching database songs:', err && err.message ? err.message : err);
    }
}

// Main execution
console.log('🎵 Cloudinary Song Fetcher');
console.log('This script will fetch songs from Cloudinary and update your MongoDB database');
console.log('with the correct titles and artists based on the filenames.\n');

// Show current database state
(async () => {
    await showCurrentDatabaseSongs();

    // Ask user if they want to proceed
    console.log('\nDo you want to fetch and update songs from Cloudinary? (y/n)');
    process.stdin.once('data', (data) => {
        const input = data.toString().trim().toLowerCase();
        if (input === 'y' || input === 'yes') {
            fetchAndUpdateCloudinarySongs();
        } else {
            console.log('Operation cancelled.');
            process.exit(0);
        }
    });
})();

