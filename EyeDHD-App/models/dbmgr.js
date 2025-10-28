const sqlite = require('better-sqlite3-with-prebuilds');
const db = new sqlite('../main.db');
exports.db = db;    