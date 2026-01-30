import Database from 'better-sqlite3';
import fs from 'fs';

type GetDBOptions = {
  logging: boolean;
  temporary: boolean;
  path?: string;
};

export default function getDB(
  options: GetDBOptions = { logging: false, temporary: false }
) {
  // Creates a temporary in memory database for testing
  if (options.temporary) {
    const db = new Database(':memory:', options.logging ? { verbose: console.log } : {});

    return db;
  }

  if (!options.path) {
    throw new Error('Database path not provided');
  }
  console.log(`Using database at ${options.path}`);

  const db = new Database(options.path, options.logging ? { verbose: console.log } : {});

  // Set for performance
  db.pragma('journal_mode = WAL');
  // Clean up wal file if it gets too big (> 500 mb)
  setInterval(() => {
    fs.stat(options.path + '-wal', (err, stat) => {
      if (err) {
        throw err;
      } else if (stat.size > 500e6) {
        db.pragma('wal_checkpoint(RESTART)');
      }
    });
  }, 5000).unref();

  return db;
}
