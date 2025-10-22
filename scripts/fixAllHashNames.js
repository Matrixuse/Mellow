const db = require('../database');

async function fixAllHashNames() {
    try {
        console.log('🔧 Fixing all remaining hash-named songs...');
        
        // Get all songs with hash names (short names that look like hashes)
        const songs = await new Promise((resolve, reject) => {
            db.all('SELECT id, title FROM songs WHERE LENGTH(title) < 15 AND title NOT LIKE "%Song%" AND title NOT LIKE "%Track%" AND title NOT LIKE "%Gem%" AND title NOT LIKE "%Harmony%" AND title NOT LIKE "%Rhythm%" AND title NOT LIKE "%Beat%" AND title NOT LIKE "%Sound%" AND title NOT LIKE "%Melody%" AND title NOT LIKE "%Tune%"', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`📊 Found ${songs.length} songs with hash names to fix`);

        let updatedCount = 0;

        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];
            
            // Generate a meaningful name
            const songNumber = song.id;
            const genres = ['Pop', 'Rock', 'Electronic', 'Jazz', 'Hip Hop', 'Classical', 'Country', 'R&B', 'Indie', 'Alternative'];
            const moods = ['Upbeat', 'Melancholic', 'Energetic', 'Calm', 'Romantic', 'Dramatic', 'Funky', 'Soulful', 'Dreamy', 'Intense'];
            
            const genre = genres[songNumber % genres.length];
            const mood = moods[songNumber % moods.length];
            
            const title = `${mood} ${genre} Track`;
            const artist = `Artist ${songNumber}`;

            // Update database
            await new Promise((resolve, reject) => {
                const sql = 'UPDATE songs SET title = ?, artist = ? WHERE id = ?';
                db.run(sql, [title, JSON.stringify([artist]), song.id], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`✅ Fixed: "${title}" by ${artist}`);
            updatedCount++;
        }

        console.log(`\n🎉 Hash name fix completed!`);
        console.log(`✅ Updated: ${updatedCount} songs`);

    } catch (error) {
        console.error('❌ Error fixing hash names:', error);
    }
}

// Run the fix
fixAllHashNames().then(() => {
    console.log('\n🏁 Hash name fix completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Fix failed:', error);
    process.exit(1);
});
