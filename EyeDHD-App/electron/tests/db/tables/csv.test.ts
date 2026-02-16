import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';

import { getDB } from '../../../db/DatabaseManager';
import { createMetadataTable, type Metadata } from '../../../db/tables/metadata';
import { createCSVTable, toTableName } from '../../../db/tables/csv';

describe('Database: CSV Data', () => {
  let db: Database;

  const seedMetadata = () => {
    createMetadataTable(db);

    db.prepare(`
      INSERT INTO metadata (name, path, request_size)
      VALUES (?, ?, ?);
    `).run('test.csv', 'test.csv', 200);

    db.prepare(`
      INSERT INTO metadata (name, path, request_size)
      VALUES (?, ?, ?);
    `).run('test2.csv', 'test2.csv', 200);

    db.prepare(`
      INSERT INTO metadata (name, path, request_size)
      VALUES (?, ?, ?);
    `).run('test3.csv', 'test3.csv', 200);
  };

  beforeEach(() => {
    db = getDB({ temporary: true, logging: false });
  });

  afterEach(() => {
    db.close();
  });

  describe('A) Table setup', () => {
    it('A1) Creates a CSV data table for a given file name', () => {
      const file = { name: 'testa.csv' } as Metadata;

      createCSVTable(db, file.name);

      const table = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name=?;
      `).get(toTableName(file.name));

      expect(table).toStrictEqual({ name: toTableName(file.name) });
    });
  });

  describe('B) CRUD operations', () => {
    it.todo('B1) Creates CSV rows tied to existing metadata', () => {
      seedMetadata();
      // TODO: insert CSV rows and validate persisted values
    });

    it.todo('B2) Reads CSV rows for a given file', () => {
      seedMetadata();
      // TODO: implement read contract once CSV table actions exist
    });
  });
});