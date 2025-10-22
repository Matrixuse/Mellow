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

async function generateSongNames() {
    try {
        console.log('🔍 Generating meaningful names for songs...');
        
        // Get all songs with hash names
        const songs = await new Promise((resolve, reject) => {
            db.all('SELECT id, title, songUrl FROM songs WHERE title LIKE "%Unknown Song%" OR LENGTH(title) < 10', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📊 Found ${songs.length} songs to rename`);

        let updatedCount = 0;

        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            
            // Generate a meaningful name based on index and some randomness
            const songNumber = i + 1;
            const genres = ['Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'Country', 'R&B', 'Indie', 'Alternative'];
            const moods = ['Upbeat', 'Melancholic', 'Energetic', 'Calm', 'Romantic', 'Dramatic', 'Funky', 'Soulful', 'Dreamy', 'Intense'];
            const artists = ['Artist', 'Singer', 'Musician', 'Performer', 'Vocalist', 'Band', 'Group', 'Ensemble', 'Soloist', 'Duo'];
            
            const genre = genres[Math.floor(Math.random() * genres.length)];
            const mood = moods[Math.floor(Math.random() * moods.length)];
            const artist = artists[Math.floor(Math.random() * artists.length)];
            
            const title = `${mood} ${genre} Song ${songNumber}`;
            const artistName = `${artist} ${songNumber}`;

            // Update database
            await new Promise((resolve, reject) => {
                const sql = 'UPDATE songs SET title = ?, artist = ? WHERE id = ?';
                db.run(sql, [title, JSON.stringify([artistName]), song.id], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`✅ Renamed: "${title}" by ${artistName}`);
            updatedCount++;
        }

        console.log(`\n🎉 Renaming completed!`);
        console.log(`✅ Updated: ${updatedCount} songs`);

    } catch (error) {
        console.error('❌ Error renaming songs:', error);
    }
}

// Alternative: Create a manual rename tool
async function createManualRenameTool() {
    try {
        console.log('📝 Creating manual rename tool...');
        
        // Get all songs with hash names
        const songs = await new Promise((resolve, reject) => {
            db.all('SELECT id, title, songUrl FROM songs WHERE title LIKE "%Unknown Song%" OR LENGTH(title) < 10 ORDER BY id', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`\n📋 Here are ${songs.length} songs that need manual renaming:`);
        console.log('=' .repeat(80));
        
        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            const urlParts = song.songUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            
            console.log(`${i + 1}. ID: ${song.id} | Current: "${song.title}" | File: ${filename}`);
        }
        
        console.log('=' .repeat(80));
        console.log('\n💡 To manually rename songs, you can:');
        console.log('1. Use the SQL commands below to update specific songs');
        console.log('2. Or use the Cloudinary web interface to add context/tags');
        console.log('3. Or re-upload songs with proper names\n');
        
        console.log('🔧 SQL Commands to rename songs (replace with actual names):');
        console.log('-- Example:');
        console.log('UPDATE songs SET title = "My Song Name", artist = \'["Artist Name"]\' WHERE id = 1;');
        console.log('UPDATE songs SET title = "Another Song", artist = \'["Another Artist"]\' WHERE id = 2;');
        console.log('-- ... and so on\n');

    } catch (error) {
        console.error('❌ Error creating manual tool:', error);
    }
}

// Run the manual rename tool
createManualRenameTool().then(() => {
    console.log('\n🏁 Manual rename tool completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Tool failed:', error);
    process.exit(1);
});
