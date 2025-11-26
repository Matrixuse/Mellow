const connectMongo = require('../config/mongo');

async function removeNewlyImportedSongs() {
    try {
        await connectMongo();
        const Song = require('../models/Song');

        console.log('🗑️  Removing imported songs...');
        
        // Get count of songs to delete
        const songsToDelete = await Song.countDocuments({});

        console.log(`📊 Found ${songsToDelete} songs to remove`);
        
        if (songsToDelete === 0) {
            console.log('✅ No songs to remove!');
            return;
        }

        // Delete all songs
        const result = await Song.deleteMany({});
        console.log(`✅ Removed ${result.deletedCount} songs`);

        // Show remaining songs (should be 0)
        const remainingSongs = await Song.countDocuments({});

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
