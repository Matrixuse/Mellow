const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function checkAllCloudinaryFiles() {
    try {
        console.log('🔍 Checking all files in Cloudinary...');
        console.log('=' .repeat(60));
        
        // Get all resources from music_app_songs folder
        const songs = await cloudinary.search
            .expression('folder:music_app_songs')
            .sort_by([['created_at', 'desc']])
            .execute();
            
        console.log(`📊 Found ${songs.resources.length} songs in music_app_songs folder:\n`);
        
        songs.resources.forEach((song, index) => {
            console.log(`${index + 1}. Filename: ${song.filename}`);
            console.log(`   Public ID: ${song.public_id}`);
            console.log(`   Format: ${song.format}`);
            console.log(`   Size: ${Math.round(song.bytes / 1024)} KB`);
            console.log(`   Created: ${new Date(song.created_at).toLocaleString()}`);
            console.log(`   URL: ${song.secure_url}`);
            console.log('');
        });
        
        // Get all resources from music_app_covers folder
        const covers = await cloudinary.search
            .expression('folder:music_app_covers')
            .sort_by([['created_at', 'desc']])
            .execute();
            
        console.log(`🖼️  Found ${covers.resources.length} covers in music_app_covers folder:\n`);
        
        covers.resources.forEach((cover, index) => {
            console.log(`${index + 1}. Filename: ${cover.filename}`);
            console.log(`   Public ID: ${cover.public_id}`);
            console.log(`   Format: ${cover.format}`);
            console.log(`   Size: ${Math.round(cover.bytes / 1024)} KB`);
            console.log(`   Created: ${new Date(cover.created_at).toLocaleString()}`);
            console.log(`   URL: ${cover.secure_url}`);
            console.log('');
        });
        
        // Check if any files have been renamed (non-hashed names)
        const renamedSongs = songs.resources.filter(song => 
            !song.filename.match(/^[a-z0-9]{20}$/) // Not a 20-character hash
        );
        
        const renamedCovers = covers.resources.filter(cover => 
            !cover.filename.match(/^[a-z0-9]{20}$/) // Not a 20-character hash
        );
        
        console.log('📝 Renamed Files Analysis:');
        console.log(`Songs with readable names: ${renamedSongs.length}/${songs.resources.length}`);
        console.log(`Covers with readable names: ${renamedCovers.length}/${covers.resources.length}`);
        
        if (renamedSongs.length > 0) {
            console.log('\n✅ Songs with readable names:');
            renamedSongs.forEach(song => {
                console.log(`  - ${song.filename}`);
            });
        }
        
        if (renamedCovers.length > 0) {
            console.log('\n✅ Covers with readable names:');
            renamedCovers.forEach(cover => {
                console.log(`  - ${cover.filename}`);
            });
        }
        
        if (renamedSongs.length === 0) {
            console.log('\n💡 No songs have been renamed yet.');
            console.log('To rename files in Cloudinary:');
            console.log('1. Go to your Cloudinary dashboard');
            console.log('2. Navigate to the music_app_songs folder');
            console.log('3. Click on each file and rename it to "Artist - Song Title" format');
            console.log('4. Then run the fetch script again');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkAllCloudinaryFiles();
