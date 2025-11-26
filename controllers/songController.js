const cloudinary = require('cloudinary').v2;
const stream = require('stream');

// If MONGO_URI is present we prefer using MongoDB (Mongoose) for songs
let SongModel = null;
try {
    if (process.env.MONGO_URI) {
        SongModel = require('../models/Song');
    }
} catch (e) {
    // ignore if model cannot be loaded
}

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const uploadFileToCloudinary = (fileBuffer, options) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error) { return reject(error); }
            resolve(result);
        });
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);
        bufferStream.pipe(uploadStream);
    });
};

const uploadSong = async (req, res) => {
    try {
        const { title, artist, moods } = req.body;
        const { songFile, coverFile } = req.files;

        if (!songFile || !coverFile || !title || !artist) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // --- YAHAN HUMNE BADLAAV KIYA HAI #1 ---
        // Hum artist string ko comma se todkar ek array bana rahe hain
        const artistsArray = artist.split(',').map(name => name.trim()).filter(Boolean);
        // Hum uss array ko JSON string mein badal rahe hain taaki database mein save kar sakein
        const artistsJsonString = JSON.stringify(artistsArray);
        
        // Parse moods from JSON string or use empty array
        let moodsArray = [];
        try {
            moodsArray = moods ? JSON.parse(moods) : [];
        } catch (e) {
            moodsArray = [];
        }
        const moodsJsonString = JSON.stringify(moodsArray);

        const [songUploadResult, coverUploadResult] = await Promise.all([
            uploadFileToCloudinary(songFile[0].buffer, { resource_type: 'video', folder: 'music_app_songs' }),
            uploadFileToCloudinary(coverFile[0].buffer, { resource_type: 'image', folder: 'music_app_covers' })
        ]);

        const songUrl = songUploadResult.secure_url;
        const coverUrl = coverUploadResult.secure_url;
        
        // Require MongoDB; do not fall back to SQLite anymore
        if (!SongModel) {
            console.error('MONGO_URI not configured: cannot save song metadata.');
            return res.status(500).json({ message: 'Server not configured for MongoDB.' });
        }

        try {
            const songDoc = await SongModel.create({
                title,
                artist: artistsArray,
                songUrl,
                coverUrl,
                moods: moodsArray,
            });
            return res.status(201).json({
                id: songDoc._id,
                title: songDoc.title,
                artist: songDoc.artist,
                songUrl: songDoc.songUrl,
                coverUrl: songDoc.coverUrl,
                moods: songDoc.moods,
            });
        } catch (err) {
            console.error('MongoDB save error:', err);
            return res.status(500).json({ message: 'Failed to save song to database.' });
        }

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Server error during file upload.' });
    }
};

const getSongs = async (req, res) => {
    if (!SongModel) {
        console.error('MONGO_URI not configured: cannot read songs.');
        return res.status(500).json({ message: 'Server not configured for MongoDB.' });
    }

    try {
        const docs = await SongModel.find({}).sort({ createdAt: -1 }).lean().exec();
        const mapped = docs.map(doc => ({
            id: doc._id,
            title: doc.title,
            artist: doc.artist,
            songUrl: doc.songUrl,
            coverUrl: doc.coverUrl,
            moods: doc.moods || []
        }));
        res.status(200).json(mapped);
    } catch (err) {
        console.error('MongoDB fetch error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getSongs, uploadSong };

