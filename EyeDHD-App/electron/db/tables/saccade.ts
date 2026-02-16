import type { Database } from 'better-sqlite3';

export default {};

// Converts filename into table name
// ID.011.csv -> ID_011_saccades
export function toTableName(filename: string) {
  // Replace '.' with '_' in filename, and remove csv
  const name = filename.replace(/\./g, '_').replace(/_csv$/, '');
  return `${name}_saccades`;
}

export type SaccadeData = {
	filename: string;
};

export function createSaccadeTable(db: Database, filename: string) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ${toTableName(filename)} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      frame INTEGER,
      timestamp REAL,
      start_index INTEGER,
      end_index INTEGER,
      duration_ms REAL,
      peak_velocity_deg_per_sec REAL,
      mean_velocity_deg_per_sec REAL,
      amplitude_deg REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `).run();
}

export function deleteSaccadeTable(db: Database, filename: string) {
  db.prepare(`
    DROP TABLE IF EXISTS ${toTableName(filename)};
  `).run();
}