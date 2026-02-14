import type { Database } from 'better-sqlite3';

export default {};

// Converts filename into table name
// ID.011.csv -> ID_011_csv_rows
export function toTableName(filename: string) {
  // Replace '.' with '_' in filename
  const name = filename.replace(/\./g, '_');
  return `${name}_rows`;
}

export type SaccadeData = {
	filename: string;
};

export function createSaccadeTable(db: Database, filename: string) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ${toTableName(filename)} (

    );
  `).run();
}

export function deleteSaccadeTable(db: Database, filename: string) {
  db.prepare(`
    DROP TABLE IF EXISTS ${toTableName(filename)};
  `).run();
}