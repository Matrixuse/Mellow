const db = require('../database');
const cloudinary = require('cloudinary').v2;
const stream = require('stream');

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
        
        const sql = 'INSERT INTO songs (title, artist, songUrl, coverUrl, moods) VALUES (?, ?, ?, ?, ?)';
        // Hum yahan JSON string save kar rahe hain
        db.run(sql, [title, artistsJsonString, songUrl, coverUrl, moodsJsonString], function(err) {
            if (err) {
                console.error("Database save error:", err);
                return res.status(500).json({ message: 'Failed to save song to database.' });
            }
            res.status(201).json({
                id: this.lastID,
                title,
                artist: artistsArray, // Frontend ko hum array hi bhejenge
                songUrl,
                coverUrl,
                moods: moodsArray,
            });
        });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Server error during file upload.' });
    }
};

const getSongs = (req, res) => {
    const sql = 'SELECT * FROM songs';
    db.all(sql, [], (err, rows) => {
        if (err) { return res.status(500).json({ message: 'Server error' }); }

        // --- YAHAN HUMNE BADLAAV KIYA HAI #2 ---
        // Hum database se aayi har song ki artist string ko waapas array mein badal rahe hain
        const songsWithArtistArray = rows.map(song => {
            try {
                // Koshish karo ki string ko JSON se parse karke array banayein
                const artists = JSON.parse(song.artist);
                const moods = song.moods ? JSON.parse(song.moods) : [];
                return { 
                    ...song, 
                    artist: Array.isArray(artists) ? artists : [song.artist],
                    moods: Array.isArray(moods) ? moods : []
                };
            } catch (e) {
                // Agar parse na ho (puraana, simple text ho), toh use ek array mein daal do
                return { 
                    ...song, 
                    artist: [song.artist],
                    moods: []
                };
            }
        });

        res.status(200).json(songsWithArtistArray);
    });
};

module.exports = { getSongs, uploadSong };

