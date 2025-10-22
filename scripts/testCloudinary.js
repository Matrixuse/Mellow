const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function testCloudinaryConnection() {
    console.log('🔍 Testing Cloudinary Connection...');
    console.log('=' .repeat(50));
    
    // Check environment variables
    console.log('Environment Variables:');
    console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
    console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
    
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        console.log('\n❌ Missing Cloudinary credentials!');
        console.log('Please check your .env file in the backend directory.');
        return;
    }
    
    try {
        // Test basic API connection
        console.log('\n🔍 Testing API connection...');
        const result = await cloudinary.api.ping();
        console.log('✅ Cloudinary API connection successful!');
        console.log('Response:', result);
        
        // List all folders
        console.log('\n📁 Listing all folders...');
        const folders = await cloudinary.api.root_folders();
        console.log('Folders found:', folders.folders ? folders.folders.map(f => f.name) : 'None');
        
        // Check for music_app_songs folder specifically
        console.log('\n🎵 Checking for music_app_songs folder...');
        const songsFolder = folders.folders ? folders.folders.find(f => f.name === 'music_app_songs') : null;
        
        if (songsFolder) {
            console.log('✅ music_app_songs folder found!');
            
            // Try to list resources in the folder
            console.log('\n🔍 Listing resources in music_app_songs folder...');
            const resources = await cloudinary.search
                .expression('folder:music_app_songs')
                .max_results(5)
                .execute();
                
            if (resources.resources && resources.resources.length > 0) {
                console.log(`✅ Found ${resources.resources.length} resources in music_app_songs folder:`);
                resources.resources.forEach((resource, index) => {
                    console.log(`  ${index + 1}. ${resource.filename} (${resource.resource_type})`);
                });
            } else {
                console.log('⚠️  No resources found in music_app_songs folder');
            }
        } else {
            console.log('❌ music_app_songs folder not found!');
            console.log('💡 Make sure you have uploaded songs to the "music_app_songs" folder in Cloudinary');
        }
        
        // Check for music_app_covers folder
        console.log('\n🖼️  Checking for music_app_covers folder...');
        const coversFolder = folders.folders ? folders.folders.find(f => f.name === 'music_app_covers') : null;
        
        if (coversFolder) {
            console.log('✅ music_app_covers folder found!');
        } else {
            console.log('⚠️  music_app_covers folder not found');
        }
        
    } catch (error) {
        console.log('\n❌ Error testing Cloudinary connection:');
        console.log('Error message:', error.message);
        console.log('Error details:', error);
        
        if (error.http_code) {
            console.log('HTTP Status Code:', error.http_code);
        }
        
        if (error.message && error.message.includes('Invalid API key')) {
            console.log('\n💡 This looks like an API key issue. Please check:');
            console.log('1. Your Cloudinary API key is correct');
            console.log('2. Your API secret is correct');
            console.log('3. Your cloud name is correct');
        }
    }
}

// Run the test
testCloudinaryConnection();
