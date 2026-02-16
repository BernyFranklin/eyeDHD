import { describe, it, expect } from 'vitest';
import { type Database } from 'better-sqlite3';

import { getDB } from '../../../db/DatabaseManager';
import { createSaccadeTable, deleteSaccadeTable, toTableName } from '../../../db/tables/saccade';

function withTempDb(run: (db: Database) => void) {
  const db = getDB({ temporary: true, logging: false });
  try {
    run(db);
  } finally {
    db.close();
  }
}

describe('Database: Saccade Data', () => {
  describe('A) Table naming', () => {
    it('A1) Converts filename to a table name with _rows suffix', () => {
      expect(toTableName('ID.011.csv')).toBe('ID_011_csv_rows');
      expect(toTableName('sample.csv')).toBe('sample_csv_rows');
    });
  });

  describe('B) Table lifecycle', () => {
    it('B1) Creates a saccade table for a given file', () => {
      withTempDb((db) => {
        const filename = 'test.csv';
        createSaccadeTable(db, filename);

        const table = db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name=?;
        `).get(toTableName(filename));

        expect(table).toStrictEqual({ name: toTableName(filename) });
      });
    });

    it('B2) Creates a table with expected columns', () => {
      withTempDb((db) => {
        const filename = 'schema_check.csv';
        createSaccadeTable(db, filename);

        const columns = db.prepare(`
          PRAGMA table_info(${toTableName(filename)});
        `).all();

        const columnNames = columns.map((c: any) => c.name);

        expect(columnNames).toEqual([
          'id',
          'frame',
          'timestamp',
          'start_index',
          'end_index',
          'duration_ms',
          'peak_velocity_deg_per_sec',
          'mean_velocity_deg_per_sec',
          'amplitude_deg',
          'created_at',
        ]);
      });
    });

    it('B3) Deletes a saccade table for a given file', () => {
      withTempDb((db) => {
        const filename = 'delete_me.csv';
        createSaccadeTable(db, filename);

        deleteSaccadeTable(db, filename);

        const table = db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name=?;
        `).get(toTableName(filename));

        expect(table).toBeUndefined();
      });
    });
  });
});