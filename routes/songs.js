const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getSongs, uploadSong } = require('../controllers/songController');
// Humne yahan middleware ko import kiya hai
const { protect, adminProtect } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to get all songs for a logged-in user (protected)
router.get('/', protect, getSongs);

// Route to upload a song (protected)
// YAHAN BADLAAV KIYA GAYA HAI:
// Humne yahan se adminProtect hata kar simple 'protect' laga diya hai
router.post('/upload', 
    protect, 
    adminProtect,
    upload.fields([
        { name: 'songFile', maxCount: 1 }, 
        { name: 'coverFile', maxCount: 1 }
    ]), 
    uploadSong
);

module.exports = router;

