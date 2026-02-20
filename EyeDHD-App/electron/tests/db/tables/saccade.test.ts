import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { type Database } from 'better-sqlite3';

import { getDB } from '../../../db/DatabaseManager';
import { createMetadataTable } from '../../../db/tables/metadata';
import { createSaccadeTable, deleteSaccadeTable, toTableName } from '../../../db/tables/saccade';

describe('Database - SaccadeData', () => {
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
      expect(toTableName('ID.011.csv')).toBe('ID_011_saccades');
      expect(toTableName('sample.csv')).toBe('sample_saccades');
    });
    it('A2) Creates a SaccadeData table for a given file name', () => {
    	expect(true).toBe(false);
    })
  });

  describe('B) Table lifecycle', () => {
    it('B1) Creates a saccade table for a given file', () => {
      const filename = 'test.csv';
      createSaccadeTable(db, filename);

      const table = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name=?;
      `).get(toTableName(filename));

      expect(table).toStrictEqual({ name: toTableName(filename) });
    });

    it('B2) Deletes a saccade table for a given file', () => {
      const filename = 'delete_me.csv';
      createSaccadeTable(db, filename);

      deleteSaccadeTable(db, filename);

      const table = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name=?;
      `).get(toTableName(filename));

      expect(table).toBeUndefined();
    });
  });

  describe('C) CRUD operations', () => {
		it('C1) Stores saccade rows tied to existing metadata', () => {
			seedMetadata();
			expect(true).toBe(false);
		});

		it('C2) Reads saccade rows for a given file', () => {
			seedMetadata();
			expect(true).toBe(false);
		});

		it('C3) Updates saccade rows for a given file', () => {
			seedMetadata();
			expect(true).toBe(false);
		});

		it('C4) Deletes saccade rows for a given file', () => {
			seedMetadata();
			expect(true).toBe(false);
		});
	});
});