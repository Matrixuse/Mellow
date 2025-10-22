const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function checkCloudinaryFiles() {
    try {
        console.log('🔍 Checking Cloudinary files...');
        console.log('=' .repeat(50));
        
        // Use admin API to list resources
        console.log('📁 Getting resources from music_app_songs folder...');
        const songsResult = await cloudinary.api.resources({
            type: 'upload',
            resource_type: 'video',
            prefix: 'music_app_songs/',
            max_results: 50
        });
        
        console.log(`📊 Found ${songsResult.resources.length} songs:\n`);
        
        songsResult.resources.forEach((song, index) => {
            console.log(`${index + 1}. Public ID: ${song.public_id}`);
            console.log(`   Filename: ${song.filename || 'No filename'}`);
            console.log(`   Format: ${song.format}`);
            console.log(`   Size: ${Math.round(song.bytes / 1024)} KB`);
            console.log(`   URL: ${song.secure_url}`);
            console.log('');
        });
        
        // Check covers
        console.log('🖼️  Getting resources from music_app_covers folder...');
        const coversResult = await cloudinary.api.resources({
            type: 'upload',
            resource_type: 'image',
            prefix: 'music_app_covers/',
            max_results: 50
        });
        
        console.log(`📊 Found ${coversResult.resources.length} covers:\n`);
        
        coversResult.resources.forEach((cover, index) => {
            console.log(`${index + 1}. Public ID: ${cover.public_id}`);
            console.log(`   Filename: ${cover.filename || 'No filename'}`);
            console.log(`   Format: ${cover.format}`);
            console.log(`   Size: ${Math.round(cover.bytes / 1024)} KB`);
            console.log(`   URL: ${cover.secure_url}`);
            console.log('');
        });
        
        // Analyze filenames
        const hashedSongs = songsResult.resources.filter(song => 
            song.public_id && song.public_id.match(/^music_app_songs\/[a-z0-9]{20}$/)
        );
        
        const readableSongs = songsResult.resources.filter(song => 
            song.public_id && !song.public_id.match(/^music_app_songs\/[a-z0-9]{20}$/)
        );
        
        console.log('📝 Analysis:');
        console.log(`Songs with hashed names: ${hashedSongs.length}`);
        console.log(`Songs with readable names: ${readableSongs.length}`);
        
        if (readableSongs.length > 0) {
            console.log('\n✅ Songs with readable names:');
            readableSongs.forEach(song => {
                const name = song.public_id.replace('music_app_songs/', '');
                console.log(`  - ${name}`);
            });
        }
        
        if (hashedSongs.length > 0) {
            console.log('\n⚠️  Songs with hashed names (need to be renamed):');
            hashedSongs.slice(0, 3).forEach(song => {
                const name = song.public_id.replace('music_app_songs/', '');
                console.log(`  - ${name}`);
            });
            if (hashedSongs.length > 3) {
                console.log(`  ... and ${hashedSongs.length - 3} more`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Full error:', error);
    }
}

checkCloudinaryFiles();
