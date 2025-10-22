const db = require('../database');

async function removeNewlyImportedSongs() {
    try {
        console.log('🗑️  Removing newly imported songs with hash names...');
        
        // First, let's see what we're about to delete
        const songsToDelete = await new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as count FROM songs WHERE id > 24', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0].count);
            });
        });

        console.log(`📊 Found ${songsToDelete} songs to remove (IDs 25 and above)`);
        
        if (songsToDelete === 0) {
            console.log('✅ No songs to remove!');
            return;
        }

        // Delete all songs with ID > 24 (the newly imported ones)
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM songs WHERE id > 24', function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log(`✅ Removed ${songsToDelete} newly imported songs`);

        // Reset the auto-increment counter to continue from 24
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM sqlite_sequence WHERE name = "songs"', function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        await new Promise((resolve, reject) => {
            db.run('INSERT INTO sqlite_sequence (name, seq) VALUES ("songs", 24)', function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        console.log('✅ Reset auto-increment counter');

        // Show remaining songs
        const remainingSongs = await new Promise((resolve, reject) => {
            db.all('SELECT COUNT(*) as count FROM songs', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0].count);
            });
        });

        console.log(`📊 Remaining songs: ${remainingSongs}`);

    } catch (error) {
        console.error('❌ Error removing songs:', error);
    }
}

// Run the removal
removeNewlyImportedSongs().then(() => {
    console.log('\n🏁 Song removal completed');
    console.log('\n💡 Next steps:');
    console.log('1. Re-upload your songs through the app\'s admin panel');
    console.log('2. Make sure to use proper song titles and artist names');
    console.log('3. This will ensure songs are saved to both Cloudinary AND database');
    process.exit(0);
}).catch(error => {
    console.error('💥 Removal failed:', error);
    process.exit(1);
});
