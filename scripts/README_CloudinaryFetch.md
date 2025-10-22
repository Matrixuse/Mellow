# Cloudinary Song Fetcher

This script helps you fetch songs from Cloudinary with their updated metadata (titles and artists) and update your local database.

## Problem Solved

When you upload songs through your app's admin panel, the titles might be stored as hashed values instead of the original names. If you've manually renamed the files in Cloudinary, this script will:

1. Fetch all songs from your Cloudinary `music_app_songs` folder
2. Extract title and artist information from the updated filenames
3. Find matching cover art from the `music_app_covers` folder
4. Update your local SQLite database with the correct metadata

## How to Use

### Prerequisites

Make sure your `.env` file in the backend directory contains your Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Running the Script

1. Navigate to your backend directory:
   ```bash
   cd backend
   ```

2. Run the script:
   ```bash
   node scripts/fetchCloudinarySongs.js
   ```

3. The script will:
   - Show you current songs in your database
   - Ask if you want to proceed with fetching from Cloudinary
   - Fetch and update all songs with correct metadata

### What the Script Does

1. **Fetches Songs**: Gets all files from your `music_app_songs` folder in Cloudinary
2. **Extracts Metadata**: Parses filenames to extract title and artist information
3. **Finds Covers**: Matches songs with their corresponding cover art
4. **Updates Database**: Updates existing songs or adds new ones to your local database

### Filename Patterns Supported

The script can extract metadata from various filename patterns:

- `Artist - Title.mp3` → Artist: "Artist", Title: "Title"
- `Title - Artist.mp3` → Artist: "Artist", Title: "Title"  
- `Song Title.mp3` → Artist: "Unknown Artist", Title: "Song Title"

### After Running

1. Refresh your music app
2. Your songs should now show with the correct titles and artists
3. Cover art should be properly matched

## Troubleshooting

- **No songs found**: Check your Cloudinary folder name is `music_app_songs`
- **No covers matched**: Make sure cover files have similar names to song files
- **Database errors**: Ensure your database file is accessible and writable

## Safety

- The script only updates metadata, it doesn't delete songs
- It shows a summary of what was updated/added
- You can run it multiple times safely
