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

async function provideRenameOptions() {
    try {
        console.log('🎵 Music Player Song Rename Tool');
        console.log('=' .repeat(50));
        
        // Get songs that need renaming
        const songs = await new Promise((resolve, reject) => {
            db.all('SELECT id, title, songUrl FROM songs WHERE title = "Unknown Song" ORDER BY id', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (songs.length === 0) {
            console.log('✅ All songs already have proper names!');
            return;
        }

        console.log(`\n📋 Found ${songs.length} songs that need renaming:`);
        console.log('-' .repeat(50));
        
        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            const urlParts = song.songUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            
            console.log(`${i + 1}. Song ID: ${song.id}`);
            console.log(`   Current Title: "${song.title}"`);
            console.log(`   Cloudinary File: ${filename}`);
            console.log(`   URL: ${song.songUrl}`);
            console.log('');
        }

        console.log('🔧 SOLUTION OPTIONS:');
        console.log('=' .repeat(50));
        
        console.log('\n📝 OPTION 1: Manual SQL Update (Recommended)');
        console.log('Run these SQL commands to rename the songs:');
        console.log('-' .repeat(30));
        
        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            console.log(`UPDATE songs SET title = "Song ${i + 1}", artist = '["Artist ${i + 1}"]' WHERE id = ${song.id};`);
        }
        
        console.log('\n📝 OPTION 2: Use Cloudinary Web Interface');
        console.log('1. Go to https://console.cloudinary.com');
        console.log('2. Find each song in the media library');
        console.log('3. Click on the song and add context/tags:');
        console.log('   - Title: "Your Song Name"');
        console.log('   - Artist: "Your Artist Name"');
        console.log('4. Then run the metadata extraction script again');
        
        console.log('\n📝 OPTION 3: Re-upload with Proper Names');
        console.log('1. Download the songs from Cloudinary');
        console.log('2. Rename them with proper titles');
        console.log('3. Re-upload through your app\'s admin panel');
        
        console.log('\n📝 OPTION 4: Quick Auto-Rename');
        console.log('Run this command to give them generic names:');
        console.log('node scripts/quickRename.js');
        
        console.log('\n🎯 RECOMMENDATION:');
        console.log('Since you only have 3 songs with "Unknown Song" titles,');
        console.log('I recommend using OPTION 1 (SQL commands) for quick fix.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the tool
provideRenameOptions().then(() => {
    console.log('\n🏁 Tool completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Tool failed:', error);
    process.exit(1);
});

