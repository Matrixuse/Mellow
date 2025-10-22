const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function updateCloudinaryMetadata(publicId, title, artist) {
    try {
        console.log(`🔄 Updating Cloudinary metadata for: ${title}`);
        
        // Update the asset with proper context and tags
        const result = await cloudinary.api.update(publicId, {
            resource_type: 'video',
            context: {
                title: title,
                artist: artist
            },
            tags: [
                `title:${title}`,
                `artist:${artist}`,
                'music_app'
            ]
        });

        console.log(`✅ Updated metadata for: ${title}`);
        return result;
    } catch (error) {
        console.error(`❌ Failed to update metadata for ${title}:`, error.message);
        throw error;
    }
}

// Enhanced upload function that ensures metadata is stored in Cloudinary
async function enhancedUpload(songFile, coverFile, title, artist) {
    try {
        console.log(`🎵 Enhanced upload: ${title} by ${artist}`);
        
        // Upload files to Cloudinary
        const [songUploadResult, coverUploadResult] = await Promise.all([
            uploadFileToCloudinary(songFile, { 
                resource_type: 'video', 
                folder: 'music_app_songs',
                context: {
                    title: title,
                    artist: artist
                },
                tags: [
                    `title:${title}`,
                    `artist:${artist}`,
                    'music_app'
                ]
            }),
            uploadFileToCloudinary(coverFile, { 
                resource_type: 'image', 
                folder: 'music_app_covers',
                context: {
                    title: title,
                    artist: artist
                },
                tags: [
                    `title:${title}`,
                    `artist:${artist}`,
                    'music_app'
                ]
            })
        ]);

        console.log(`✅ Files uploaded successfully`);
        
        // Return the results
        return {
            songUrl: songUploadResult.secure_url,
            coverUrl: coverUploadResult.secure_url,
            songPublicId: songUploadResult.public_id,
            coverPublicId: coverUploadResult.public_id
        };

    } catch (error) {
        console.error('❌ Enhanced upload failed:', error);
        throw error;
    }
}

async function uploadFileToCloudinary(filePath, options) {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(filePath, options, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
    });
}

module.exports = { 
    updateCloudinaryMetadata, 
    enhancedUpload 
};

console.log('📋 Enhanced Upload Module Created');
console.log('💡 This module ensures proper metadata storage in Cloudinary');
console.log('💡 Use this for future uploads to prevent metadata loss');
