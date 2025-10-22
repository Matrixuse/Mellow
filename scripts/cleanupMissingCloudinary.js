const cloudinary = require('cloudinary').v2;
const db = require('../database');
const url = require('url');
const path = require('path');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function extractPublicIdAndTypeFromUrl(resourceUrl) {
  try {
    if (!resourceUrl) return null;
    const parsed = url.parse(resourceUrl);
    // Expected formats:
    // https://res.cloudinary.com/<cloud>/video/upload/v<ts>/music_app_songs/<id>.mp3
    // https://res.cloudinary.com/<cloud>/image/upload/v<ts>/music_app_covers/<id>.png
    const segments = parsed.pathname.split('/').filter(Boolean);
    // segments: ['<res-cloud>', 'video'|'image', 'upload', 'v123', 'music_app_songs', '<id>.<ext>']
    const resourceType = segments[1]; // 'video' or 'image'
    const folder = segments[4];
    const fileWithExt = segments[5];
    if (!resourceType || !folder || !fileWithExt) return null;
    const fileName = path.parse(fileWithExt).name; // strip extension
    const publicId = `${folder}/${fileName}`; // e.g., music_app_songs/abc123
    return { publicId, resourceType };
  } catch (_) {
    return null;
  }
}

async function cloudinaryResourceExists(publicId, resourceType) {
  try {
    if (!publicId) return false;
    const result = await cloudinary.api.resource(publicId, { resource_type: resourceType || 'image' });
    return Boolean(result && result.public_id);
  } catch (err) {
    // 404 -> not found
    if (err && (err.http_code === 404 || /not found/i.test(String(err.message)))) return false;
    // Other errors -> log and assume missing to be safe
    console.error(`Cloudinary check error for ${publicId}:`, err.message || err);
    return false;
  }
}

async function main() {
  console.log('🧹 Cleaning up DB entries whose Cloudinary resources were deleted...');
  console.log('='.repeat(60));

  // Load songs from DB
  const allSongs = await new Promise((resolve, reject) => {
    db.all('SELECT id, title, artist, songUrl, coverUrl FROM songs ORDER BY id', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

  console.log(`📀 DB has ${allSongs.length} song rows`);

  let toDeleteIds = [];
  let checked = 0;

  for (const song of allSongs) {
    checked++;
    const songInfo = extractPublicIdAndTypeFromUrl(song.songUrl);
    const coverInfo = extractPublicIdAndTypeFromUrl(song.coverUrl);

    const songExists = songInfo
      ? await cloudinaryResourceExists(songInfo.publicId, songInfo.resourceType)
      : false;
    const coverExists = coverInfo
      ? await cloudinaryResourceExists(coverInfo.publicId, coverInfo.resourceType)
      : false;

    if (!songExists || !coverExists) {
      console.log(`❌ Missing resource(s) for ID ${song.id} -> title: ${song.title}`);
      if (!songExists) console.log(`   - Song missing: ${song.songUrl}`);
      if (!coverExists) console.log(`   - Cover missing: ${song.coverUrl}`);
      toDeleteIds.push(song.id);
    }
  }

  if (toDeleteIds.length === 0) {
    console.log('✅ No stale rows found. DB is in sync with Cloudinary.');
    process.exit(0);
  }

  console.log(`\n🗑️  Deleting ${toDeleteIds.length} stale DB row(s)...`);
  await new Promise((resolve) => {
    const stmt = db.prepare('DELETE FROM songs WHERE id = ?');
    for (const id of toDeleteIds) {
      stmt.run(id);
    }
    stmt.finalize(resolve);
  });

  console.log('🎉 Cleanup complete. Removed IDs:', toDeleteIds.join(', '));
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Cleanup failed:', e.message || e);
  process.exit(1);
});


