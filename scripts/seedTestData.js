const connectMongo = require('../config/mongo');

const seed = async () => {
  try {
    await connectMongo();
  } catch (err) {
    console.error('MongoDB connection failed:', err && err.message ? err.message : err);
    process.exit(1);
  }

  const User = require('../models/User');
  const Song = require('../models/Song');
  const Playlist = require('../models/Playlist');

  // Insert test user if not exists
  try {
    let user = await User.findOne({ email: 'test@example.com' }).lean();
    if (user) {
      console.log('Test user already exists with id', user._id);
    } else {
      const created = await User.create({ name: 'Test User', email: 'test@example.com', password: 'passwordhash' });
      console.log('Inserted test user id', created._id);
      user = created;
    }

    // Insert test song if not exists
    let song = await Song.findOne({ title: 'Test Song' }).lean();
    if (song) {
      console.log('Test song already exists with id', song._id);
    } else {
      const createdSong = await Song.create({ title: 'Test Song', artist: ['Test Artist'], songUrl: '/songs/test.mp3', coverUrl: '/covers/test.jpg', moods: ['chill'] });
      console.log('Inserted test song id', createdSong._id);
      song = createdSong;
    }

    // Insert test playlist for test user
    if (!user) {
      console.log('Test user not present; playlist will be created on next run.');
    } else {
      let pl = await Playlist.findOne({ name: 'Test Playlist', userId: user._id }).lean();
      if (pl) {
        console.log('Test playlist already exists with id', pl._id);
      } else {
        const createdPl = await Playlist.create({ name: 'Test Playlist', description: 'Seeded test playlist', userId: user._id });
        console.log('Inserted test playlist id', createdPl._id);
      }
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }

  setTimeout(() => process.exit(0), 500);
};

seed();
