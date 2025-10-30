// ESM version
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';

let _db;

/**
 * Lazily create and return a shared DB instance.
 * Call this only after the app is ready (ipc handlers are fine).
 */
export function getDb() {
  if (!_db) {
    const appRoot = app.getAppPath();
    const dbPath = path.join(appRoot,'main.db');
    
    console.log(`Using database at ${dbPath}`);
    _db = new Database(dbPath); // synchronous open
  }
  return _db;
}
