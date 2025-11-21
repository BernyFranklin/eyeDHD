import Database from 'better-sqlite3';
import fs from 'fs';

export default function getDB(options = { testing: false, path: null }) {
  // Creates a temporary in memory database for testing
  if (options.testing) {
    const db = new Database(':memory:', { verbose: console.log });

    return db;
  }

  if (!options.path) {
    throw new Error('Database path not provided');
  }
  console.log(`Using database at ${options.path}`);

  const db = new Database(options.path);

  // Set for performance
  db.pragma('journal_mode = WAL');
  // Clean up wal file if it gets too big (> 500 mb)
  setInterval(
    fs.stat.bind(null, options.path + '-wal', (err, stat) => {
      if (err) {
        throw err;
      } else if (stat.size > 500e6) {
        db.pragma('wal_checkpoint(RESTART)');
      }
    }),
    5000
  ).unref();

  return db;
}
