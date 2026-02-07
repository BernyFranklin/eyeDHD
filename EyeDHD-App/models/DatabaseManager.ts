import { type Database, default as Sqlite3DB } from 'better-sqlite3';
import fs from 'fs';

import DataStream from './DataStream';
import { type CSVData } from './tables/csvrow';
import { createMetadataTable, type Metadata } from './tables/metadata';
import { type SaccadeData } from './tables/saccades';
import DataCleaner from '../electron/data/DataCleaner';

type DBOptions = {
  logging: boolean;
  temporary: boolean;
  path?: string;
};

export default class DatabaseManager {
  db: Database;
  options: DBOptions;

  private streams = new Map<string, DataStream<any>>();
  private cleaners = new Map<string, DataCleaner>();

  constructor(options: DBOptions = { logging: false, temporary: false }) {
    this.options = options;

    this.db = this.getDB();
  }

  init() {
    createMetadataTable(this.db);
  }

  read<T>(
    kind: new (...args: any[]) => T,
    filename: string,
    amount: number = 1
  ): T | null {
    if (kind === CSVData) {
      return true as T;
    } else if (kind === Metadata) {
      return true as T;
    } else if (kind === SaccadeData) {
      return true as T;
    }
    return null;
  }

  write<T>(kind: Kind, filename: string, data: T | T[]): boolean {
    if (kind === 'CSVData') {
      return true;
    } else if (kind === 'Metadata') {
      return true;
    } else if (kind === 'SaccadeData') {
      return true;
    }

    return false;
  }

  update<T>(kind: Kind, filename: string, data: T): boolean {
    if (kind === 'CSVData') {
      return true;
    } else if (kind === 'Metadata') {
      return true;
    } else if (kind === 'SaccadeData') {
      return true;
    }

    return false;
  }

  prepare(sql: string) {
    return this.db.prepare(sql);
  }

  private getDB() {
    // Creates a temporary in memory database for testing
    if (this.options.temporary) {
      const db = new Sqlite3DB(
        ':memory:',
        this.options.logging ? { verbose: console.log } : {}
      );

      return db;
    }

    if (!this.options.path) {
      throw new Error('Database path not provided');
    }
    console.log(`Using database at ${this.options.path}`);

    const db = new Sqlite3DB(
      this.options.path,
      this.options.logging ? { verbose: console.log } : {}
    );

    // Set for performance
    db.pragma('journal_mode = WAL');
    // Clean up wal file if it gets too big (> 500 mb)
    setInterval(() => {
      fs.stat(this.options.path + '-wal', (err, stat) => {
        if (err) {
          throw err;
        } else if (stat.size > 500e6) {
          db.pragma('wal_checkpoint(RESTART)');
        }
      });
    }, 5000).unref();

    return db;
  }
}
