const sqlite = require('better-sqlite3');
const db = new sqlite('../main.db');
exports.db = db;