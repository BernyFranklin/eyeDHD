import { type Database, default as Sqlite3DB } from 'better-sqlite3';
import fs from 'fs';

import DataStream from './DataStream.ts';
import csvActions, {
  type CSVData,
  createRowTable,
  deleteRowTable
} from './tables/csv.ts';
import metadataActions, {
  type Metadata,
  createMetadataTable
} from './tables/metadata.ts';
import saccadeActions, { type SaccadeData } from './tables/saccade.ts';
import DataCleaner from '../data/DataCleaner.js';

// Database options
type DBOptions = {
  logging: boolean;
  temporary: boolean;
  path?: string;
};

// Database action types
type MetadataActions = {
  create: (filename: string, filepath: string, request_size: number) => Metadata | null;
  read: (filename: string) => Metadata | null;
  readAll: () => Metadata[] | null;
  update: (updates: Metadata) => boolean;
  remove: (file: Metadata) => Metadata | null;
};

type CSVActions = {
  create: (file: Metadata, rows: CSVData[]) => boolean;
  read: (file: Metadata) => CSVData[] | undefined;
  readAll: (file: Metadata) => CSVData[] | undefined;
  firstAndLast: (file: Metadata) => { first: CSVData; last: CSVData } | undefined;
};

type SaccadeDataActions = {};

// Database manager
export default class DatabaseManager {
  db: Database;
  options: DBOptions;
  metadata: MetadataActions;
  csv: CSVActions;
  saccade: SaccadeDataActions;

  private streams = new Map<string, DataStream<any>>();
  private cleaners = new Map<string, DataCleaner>();

  constructor(options: DBOptions = { logging: false, temporary: false }) {
    this.options = options;

    this.db = this.getDB();
    createMetadataTable(this.db);

    this.metadata = {
      create: (filename: string, filepath: string, request_size: number) => {
        return metadataActions.create(this.db, filename, filepath, request_size);
      },
      read: (filename: string) => {
        return metadataActions.read(this.db, filename);
      },
      readAll: () => {
        return metadataActions.readAll(this.db);
      },
      update: (updates: Metadata) => {
        return metadataActions.update(this.db, updates);
      },
      remove: (file: Metadata) => {
        return metadataActions.remove(this.db, file);
      }
    };

    this.csv = {
      create: (file: Metadata, rows: CSVData[]) => {
        return csvActions.create(this.db, file, rows);
      },
      read: (file: Metadata) => {
        return csvActions.read(this.db, file);
      },
      readAll: (file: Metadata) => {
        return csvActions.readAll(this.db, file);
      },
      firstAndLast: (file: Metadata) => {
        return csvActions.firstAndLast(this.db, file);
      }
    };

    this.saccade = saccadeActions;
  }

  prepare(sql: string) {
    return this.db.prepare(sql);
  }

  createCSVTable(file: Metadata) {
    createRowTable(this.db, file.name);
  }

  deleteCSVTable(file: Metadata) {
    deleteRowTable(this.db, file.name);
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
