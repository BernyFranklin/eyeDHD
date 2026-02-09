import { type Database, default as Sqlite3DB } from 'better-sqlite3';
import fs from 'fs';

import DataStream from './Stream';
import csvActions, { type CSVData, createCSVTable, deleteCSVTable } from './tables/csv';
import metadataActions, { type Metadata, createMetadataTable } from './tables/metadata';
import saccadeActions, { type SaccadeData } from './tables/saccade';
import DataCleaner from './Cleaner';

// Database configuration options
type DBOptions = {
	logging: boolean;
	temporary: boolean;
	path?: string;
};

// Database action types defining the public-facing API for interacting with the database

// Public functionality available for Metadata
type MetadataActions = {
	create: (filename: string, filepath: string, request_size: number) => void;
	exists: (filename: string) => boolean;
	read: (filename: string) => Metadata;
	readAll: () => Metadata[];
	update: (updates: Metadata) => void;
	remove: (file: Metadata) => Metadata;
};

// Public functionality available for CSV Data
type CSVActions = {
	create: (file: Metadata, rows: CSVData[]) => void;
	read: (file: Metadata) => CSVData[];
	readAll: (file: Metadata) => CSVData[];
	firstAndLast: (file: Metadata) => { first: CSVData; last: CSVData };
	clear: (file: Metadata) => void;
};

// Public functionality available for Saccade Data
type SaccadeDataActions = {
	create: () => void;
};

/**
 * Database Manager responsible for handling all database requests
 * and managing data streams sent to the frontend
 */
export default class DatabaseManager {
	private db: Database;
	private options: DBOptions;
	private cleaners = new Map<string, DataCleaner>();
	private metadataStreams = new Map<string, DataStream<Metadata>>();
	private csvStreams = new Map<string, DataStream<CSVData>>();
	private saccadeStreams = new Map<string, DataStream<SaccadeData>>();

	// These fields contain the public API for interacting with the database
	metadata: MetadataActions;
	csv: CSVActions;
	saccade: SaccadeDataActions;

	constructor(options: DBOptions = { logging: false, temporary: false }) {
		this.options = options;

		this.db = this.getDB();
		this.createMetadataTable();

		// Initialize the public API for interacting with the database

		this.metadata = {
			create: (filename: string, filepath: string, request_size: number) => {
				const metadata = metadataActions.create(
					this.db,
					filename,
					filepath,
					request_size
				);

				this.createCSVTable(metadata);
				this.createSaccadeTable(metadata);
				this.setDataCleaner(metadata);
			},
			exists: (filename: string) => {
				return metadataActions.exists(this.db, filename);
			},
			read: (filename: string) => {
				return metadataActions.read(this.db, filename);
			},
			readAll: () => {
				return metadataActions.readAll(this.db);
			},
			update: (updates: Metadata) => {
				const ok = metadataActions.update(this.db, updates);
				if (!ok) {
					throw new Error(`Failed to update metadata for file: ${updates.name}`);
				}
			},
			remove: (file: Metadata) => {
				return metadataActions.remove(this.db, file);
			}
		};

		this.csv = {
			create: (file: Metadata, rows: CSVData[]) => {
				const ok = csvActions.create(this.db, file, rows);
				if (!ok) {
					throw new Error(`Failed to insert csv data for file: ${file.name}`);
				}
			},
			read: (file: Metadata) => {
				return csvActions.read(this.db, file);
			},
			readAll: (file: Metadata) => {
				return csvActions.readAll(this.db, file);
			},
			firstAndLast: (file: Metadata) => {
				return csvActions.firstAndLast(this.db, file);
			},
			clear: (file: Metadata) => {
				this.deleteCSVTable(file);
				this.createCSVTable(file);
			}
		};

		this.saccade = {
			create: () => {

			}
		};
	}

	/**
	 * Closes the database connection
	 */
	close() {
		this.db.close();
	}

	// Private helper functions

	/**
	 * Initializes the database connection based on the provided options
	 */
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

	/**
	 * Creates a new data cleaner and stores in in the cleaners map
	 */
	setDataCleaner(file: Metadata) {
		this.cleaners.set(file.name, new DataCleaner({
			dbmgr: this,
			name: file.name,
			path: file.path,
			request_size: file.request_size
		}));
	}

	/**
	 * Checks whether a cleaner exists for a given file
	 */
	cleanerExists(file: Metadata): boolean {
		return this.cleaners.has(file.name);
	}

	/**
	 * Gets the cleaner for a given file
	 */
	getCleaner(file: Metadata): DataCleaner | undefined {
		return this.cleaners.get(file.name);
	}

	/**
	 * Deletes the cleaner for a given file
	 */
	deleteCleaner(file: Metadata): boolean {
		return this.cleaners.delete(file.name);
	}

	// Database table management functions

	/**
	 * Creates the metadata table if it doesn't already exist
	 */
	private createMetadataTable() {
		createMetadataTable(this.db);
	}

	/**
	 * Creates a new table for storing csv data for a given file
	 */
	private createCSVTable(file: Metadata) {
		createCSVTable(this.db, file.name);
	}

	/**
	 * Deletes the csv data table for a given file
	 */
	private deleteCSVTable(file: Metadata) {
		deleteCSVTable(this.db, file.name);
	}

	/**
	 * Creates a new table for storing saccade data for a given file
	 */
	private createSaccadeTable(file: Metadata) {

	}

	/**
	 * Deletes the saccade data table for a given file
	 */
	private deleteSaccadeTable(file: Metadata) {

	}
}
