const db = require('../database');

async function restoreOriginalSongNames() {
    try {
        console.log('🔄 Restoring original song names...');
        
        // Define the original song names based on what we know should be there
        const originalSongs = [
            { id: 1, title: "Nadaan Parindey Rockstar", artist: ["A.R. Rahman", "Mohit Chauhan"] },
            { id: 3, title: "Kun Faaya Kun Rockstar", artist: ["A.R. Rahman"] },
            { id: 4, title: "Kabhi Kabhi Aditi", artist: ["Rashid Ali"] },
            { id: 5, title: "Maahi Ve", artist: ["A.R. Rahman"] },
            { id: 6, title: "Tere Bina", artist: ["A.R. Rahman"] },
            { id: 7, title: "Promise", artist: ["Akira Yamaoka"] },
            { id: 8, title: "Chammak Challo Ra One", artist: ["Akon"] },
            { id: 9, title: "Faded", artist: ["Alan Walker"] },
            { id: 10, title: "Spectre", artist: ["Alan Walker"] },
            { id: 12, title: "On My Way", artist: ["Alan Walker", "Sabrina Carpenter"] },
            { id: 13, title: "Let Me Down Slowly", artist: ["Alec Benjamin"] },
            { id: 14, title: "Shubhaarambh Kai Po Che", artist: ["Amit Trivedi"] },
            { id: 15, title: "Amplifier", artist: ["Imran Khan"] },
            { id: 16, title: "Galliyan Ek Villain", artist: ["Ankit Tiwari"] },
            { id: 19, title: "Arcade", artist: ["Duncan Laurence"] },
            { id: 20, title: "Aaj Phir Hate Story 2", artist: ["Arijit Singh"] },
            { id: 21, title: "Bulleya", artist: ["Arijit Singh"] },
            { id: 22, title: "Darkhaast", artist: ["Arijit Singh"] },
            { id: 23, title: "Dil Ko Maine Di Kasam", artist: ["Arijit Singh"] },
            { id: 24, title: "Duaa Shanghai", artist: ["Arijit Singh"] }
        ];

        let updatedCount = 0;

        for (const song of originalSongs) {
            // Update database
            await new Promise((resolve, reject) => {
                const sql = 'UPDATE songs SET title = ?, artist = ? WHERE id = ?';
                db.run(sql, [song.title, JSON.stringify(song.artist), song.id], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`✅ Restored: "${song.title}" by ${song.artist.join(', ')}`);
            updatedCount++;
        }

        console.log(`\n🎉 Restoration completed!`);
        console.log(`✅ Updated: ${updatedCount} songs`);

    } catch (error) {
        console.error('❌ Error restoring song names:', error);
    }
}

// Run the restoration
restoreOriginalSongNames().then(() => {
    console.log('\n🏁 Song name restoration completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Restoration failed:', error);
    process.exit(1);
});

