// Re-export the unified DB module created in config/db.js to avoid duplicate DB instances.
// This file exists for backward compatibility so older imports like require('../database')
// keep working while the real DB initialization lives in `config/db.js`.
module.exports = require('./config/db');

