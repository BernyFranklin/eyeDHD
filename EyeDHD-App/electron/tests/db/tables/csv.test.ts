import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';

import { getDB } from '../../../db/DatabaseManager';
import { createMetadataTable, type Metadata } from '../../../db/tables/metadata';
import { createCSVTable, toTableName } from '../../../db/tables/csv';

describe('Database - CSVData', () => {
  let db: Database;

  const seedMetadata = () => {
    createMetadataTable(db);

    db.prepare(`
      INSERT INTO metadata (name, path)
      VALUES (?, ?);
    `).run('test.csv', 'test.csv');

    db.prepare(`
      INSERT INTO metadata (name, path)
      VALUES (?, ?);
    `).run('test2.csv', 'test2.csv');

    db.prepare(`
      INSERT INTO metadata (name, path)
      VALUES (?, ?);
    `).run('test3.csv', 'test3.csv');
  };

  beforeEach(() => {
    db = getDB({ temporary: true, logging: false });
  });

  afterEach(() => {
    db.close();
  });

  describe('A) Table setup', () => {
  	it('A1) Converts filename to a table name with _rows suffix', () => {
			expect(toTableName('ID.011.csv')).toBe('ID_011_csv_rows');
			expect(toTableName('sample.csv')).toBe('sample_csv_rows');
		});

    it('A2) Creates a CSV data table for a given file name', () => {
      const file = { name: 'testa.csv' } as Metadata;

      createCSVTable(db, file.name);

      const table = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name=?;
      `).get(toTableName(file.name));

      expect(table).toStrictEqual({ name: toTableName(file.name) });
    });
  });

  describe('B) Table lifecycle', () => {
    it('B1) Creates a CSV table for a given file', () => {
    });

    it('B2) Deletes a CSV table for a given file', () => {
    });
  });

  describe('C) CRUD operations', () => {
    it('C1) Creates CSV rows tied to existing metadata', () => {
      seedMetadata();
      expect(true).toBe(false);
    });

    it('C2) Reads CSV rows for a given file', () => {
      seedMetadata();
      expect(true).toBe(false);
    });

    it('C3) Deletes CSV rows for a given file when resetting cleaning', () => {
			seedMetadata();
			expect(true).toBe(false);
    });

    it('C4) Deletes CSV rows for a given file when removing metadata', () => {
			seedMetadata();
			expect(true).toBe(false);
		});
  });
});