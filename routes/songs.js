const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getSongs, uploadSong } = require('../controllers/songController');
// Use the standard protect middleware for authenticated routes
const { protect } = require('../middleware/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to get all songs for a logged-in user (protected)
router.get('/', protect, getSongs);

// Route to upload a song (authenticated users)
router.post('/upload', 
    protect,
    upload.fields([
        { name: 'songFile', maxCount: 1 }, 
        { name: 'coverFile', maxCount: 1 }
    ]),
    uploadSong
);

module.exports = router;

