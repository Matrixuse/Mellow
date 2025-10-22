const db = require('../database');

async function cleanUpIncorrectSongs() {
    try {
        console.log('🧹 Cleaning up songs with incorrect names...');
        
        // Remove songs that have "Admin Upload" titles (these are the incorrectly synced ones)
        const result = await new Promise((resolve, reject) => {
            db.run('DELETE FROM songs WHERE title LIKE "Admin Upload%"', function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });

        console.log(`✅ Removed ${result.changes} songs with incorrect names`);

        // Get remaining song count
        const remainingSongs = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM songs', [], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        console.log(`📊 Remaining songs: ${remainingSongs}`);

    } catch (error) {
        console.error('❌ Error cleaning up songs:', error);
    }
}

// Run the cleanup
cleanUpIncorrectSongs().then(() => {
    console.log('\n🏁 Cleanup completed');
    console.log('\n💡 Next steps:');
    console.log('1. Re-upload your songs through the admin panel');
    console.log('2. Make sure to enter proper titles and artist names');
    console.log('3. The admin panel is now fixed to use local server');
    console.log('4. This will ensure proper titles and artist names');
    process.exit(0);
}).catch(error => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
});
