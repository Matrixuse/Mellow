const cloudinary = require('cloudinary').v2;
const connectMongo = require('../config/mongo');
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
    const nameWithoutExt = path.parse(filename).name;
    let title = nameWithoutExt;
    let artist = 'Unknown Artist';
    
    if (nameWithoutExt.includes(' - ')) {
        const parts = nameWithoutExt.split(' - ');
        if (parts.length >= 2) {
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        }
    }
    
    // Clean up
    title = title.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    artist = artist.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    
    return { title, artist };
}

// Function to find matching cover
async function findMatchingCover(songFilename) {
    try {
        const songNameWithoutExt = path.parse(songFilename).name;
        
        const covers = await cloudinary.search
            .expression(`folder:music_app_covers AND filename:${songNameWithoutExt}*`)
            .execute();
            
        if (covers.resources && covers.resources.length > 0) {
            return covers.resources[0].secure_url;
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

// Main function
async function fetchAndUpdateSongs() {
    try {
        console.log('🎵 Fetching songs from Cloudinary...');
        
        // Test Cloudinary connection first
        console.log('🔍 Testing Cloudinary connection...');
        console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing');
        console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing');
        console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing');
        
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            console.log('❌ Missing Cloudinary credentials in .env file');
            return;
        }
        
        console.log('🔍 Searching for songs in music_app_songs folder...');
        const songs = await cloudinary.search
            .expression('folder:music_app_songs')
            .sort_by([['created_at', 'desc']])
            .execute();
            
        console.log('📊 Search result:', songs);
        
        if (!songs.resources || songs.resources.length === 0) {
            console.log('❌ No songs found in Cloudinary music_app_songs folder');
            console.log('💡 Make sure your songs are uploaded to the "music_app_songs" folder in Cloudinary');
            return;
        }
        
        console.log(`📊 Found ${songs.resources.length} songs`);
        
        let updatedCount = 0;
        let newCount = 0;
        
        // connect to MongoDB
        try {
            await connectMongo();
        } catch (err) {
            console.error('MongoDB connection failed:', err && err.message ? err.message : err);
            process.exit(1);
        }

        const Song = require('../models/Song');

        for (const cloudinarySong of songs.resources) {
            const { title, artist } = extractMetadataFromFilename(cloudinarySong.filename);
            const songUrl = cloudinarySong.secure_url;
            const coverUrl = await findMatchingCover(cloudinarySong.filename);
            
            const artistsArray = artist.split(',').map(name => name.trim()).filter(Boolean);
            const artistsJsonString = JSON.stringify(artistsArray);
            
            // Check if song exists in Mongo
            try {
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
                console.error('Error updating/inserting song:', err);
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        setTimeout(() => {
            console.log(`\n📈 Summary: ${updatedCount} updated, ${newCount} new songs`);
            console.log('🎉 Done! Refresh your app to see the changes.');
            process.exit(0);
        }, 3000);
        
    } catch (error) {
        console.error('❌ Error occurred:');
        console.error('Error message:', error.message);
        console.error('Error details:', error);
        
        if (error.http_code) {
            console.error('HTTP Status:', error.http_code);
        }
        
        if (error.message && error.message.includes('Invalid API key')) {
            console.log('💡 Check your Cloudinary API credentials in .env file');
        }
        
        process.exit(1);
    }
}

// Run immediately
fetchAndUpdateSongs();
