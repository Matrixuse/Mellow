const connectMongo = require('../config/mongo');

async function quickRename() {
    try {
        await connectMongo();
        const Song = require('../models/Song');

        console.log('🚀 Quick Rename Tool - Giving generic names to unknown songs');
        console.log('='.repeat(60));
        
        // Get songs that need renaming
        const songs = await Song.find({ title: 'Unknown Song' }).sort({ _id: 1 }).lean();

        if (!songs || songs.length === 0) {
            console.log('✅ No songs need renaming!');
            return;
        }

        console.log(`📊 Found ${songs.length} songs to rename`);
        
        const songNames = [
            { title: "Mystery Track", artist: "Unknown Artist" },
            { title: "Hidden Gem", artist: "Anonymous" },
            { title: "Secret Song", artist: "Mystery Band" },
            { title: "Lost Melody", artist: "Unknown Performer" },
            { title: "Forgotten Tune", artist: "Hidden Artist" },
            { title: "Silent Track", artist: "Mystery Musician" },
            { title: "Unknown Harmony", artist: "Secret Band" },
            { title: "Hidden Rhythm", artist: "Anonymous Group" },
            { title: "Lost Beat", artist: "Mystery Singer" },
            { title: "Secret Sound", artist: "Unknown Band" }
        ];

        let updatedCount = 0;

        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            const nameIndex = i % songNames.length;
            const songInfo = songNames[nameIndex];
            
            // Add number if we have more songs than names
            const title = songs.length > songNames.length ? 
                `${songInfo.title} ${i + 1}` : 
                songInfo.title;
            
            const artist = songs.length > songNames.length ? 
                `${songInfo.artist} ${i + 1}` : 
                songInfo.artist;

            // Update database
            await Song.findByIdAndUpdate(song._id, { title, artist: [artist] });

            console.log(`✅ Renamed: "${title}" by ${artist}`);
            updatedCount++;
        }

        console.log(`\n🎉 Quick rename completed!`);
        console.log(`✅ Updated: ${updatedCount} songs`);
        console.log('\n💡 You can now see these songs in your app with proper names!');

    } catch (error) {
        console.error('❌ Error during quick rename:', error);
    }
}

// Run the quick rename
quickRename().then(() => {
    console.log('\n🏁 Quick rename tool completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Tool failed:', error);
    process.exit(1);
});

