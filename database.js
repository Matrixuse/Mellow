// SQLite has been removed. This module remains as a compatibility shim so that any
// remaining imports of `require('../database')` will get a clear error when used.
// Update code to use Mongoose models (e.g., require('../models/Song')).

const handler = {
	get() {
		throw new Error('SQLite support has been removed. Use MongoDB (Mongoose) models instead.');
	},
	apply() {
		throw new Error('SQLite support has been removed. Use MongoDB (Mongoose) models instead.');
	}
};

module.exports = new Proxy({}, handler);

