console.error('\nThis migration script has been archived because SQLite support was removed from the codebase.');
console.error('If you need to migrate an existing SQLite `music_app.db` to MongoDB, restore a previous commit that includes `migrateSqliteToMongo.js` or re-add `sqlite3` as a temporary dependency.');
console.error('\nRecommended steps:\n 1) Re-add sqlite3 to package.json and run `npm install`\n 2) Set `MONGO_URI` env var and run this script to migrate data\n\nNote: The project now assumes MongoDB for runtime operation.');
process.exit(1);

