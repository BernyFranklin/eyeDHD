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
	store: (file: Metadata, rows: CSVData[]) => void;
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

		this.db = getDB(options);
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
				this.setCleaner(metadata);
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
			store: (file: Metadata, rows: CSVData[]) => {
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

	/**
   *
   */
	openFile(filename: string, filepath: string, request_size: number) {
		if (this.metadata.exists(filename)) {
			const metadata = this.metadata.read(filename);
			if (!this.cleanerExists(metadata)) {
				this.resetCleaner(metadata);
			}

			if (request_size != metadata.request_size) {
				this.metadata.update({
					...metadata,
					request_size
				});
			}
		} else {
			this.metadata.create(filename, filepath, request_size);
		}
	}

	/**
   * TODO: update Cleaner and this function to clean whole file
   */
	async cleanFile(file: Metadata): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				let metadata = file;

				const cleaner = this.getCleaner(metadata);
				let buffer = await cleaner.getBuffer();

				if (cleaner.status.done) {
					return;
				}

				// Only set the first frame number when cleaning is not in progress
				if (metadata.cleaned === 0) {
					this.metadata.update({
						...metadata,
						header: cleaner.header.join(',') + '\n',
						first_frame: buffer?.[0].Frame
					});

					metadata = this.metadata.read(metadata.name);
				}

				while (buffer) {
					this.csv.store(metadata, buffer);

					this.metadata.update({
						...metadata,
						last_frame: buffer[buffer.length - 1].Frame,
						cleaned: (metadata.cleaned += buffer.length)
					});

					buffer = await cleaner.getBuffer();
					metadata = this.metadata.read(metadata.name);
				}

				this.metadata.update({ ...metadata, completed: 1 });
				cleaner.close();

				return resolve();
			} catch (err) {
				return reject(`Failed to clean file: ${err}`);
			}
		});
	}

	// Private helper functions

	/**
	 * Creates a new data cleaner and stores in in the cleaners map
	 */
	private setCleaner(file: Metadata) {
		this.cleaners.set(file.name, new DataCleaner({
			dbmgr: this,
			name: file.name,
			path: file.path,
			request_size: file.request_size
		}));
	}

	/**
	 * Deletes the cleaner for a given file
	 */
	private deleteCleaner(file: Metadata): boolean {
		return this.cleaners.delete(file.name);
	}

	/**
	 * Resets the cleaner for a given file
	 */
	resetCleaner(file: Metadata) {
		this.deleteCleaner(file);
		this.setCleaner(file);
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
	getCleaner(file: Metadata): DataCleaner {
		return this.cleaners.get(file.name);
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

/**
	* Initializes the database connection based on the provided options
	*/
export function getDB(options: DBOptions = { logging: false, temporary: false }) {
		// Creates a temporary in memory database for testing
		if (options.temporary) {
			const db = new Sqlite3DB(
				':memory:',
				options.logging ? { verbose: console.log } : {}
			);

			return db;
		}

		if (!options.path) {
			throw new Error('Database path not provided');
		}
		console.log(`Using database at ${options.path}`);

		const db = new Sqlite3DB(
			options.path,
			options.logging ? { verbose: console.log } : {}
		);

		// Set for performance
		db.pragma('journal_mode = WAL');
		// Clean up wal file if it gets too big (> 500 mb)
		setInterval(() => {
			fs.stat(options.path + '-wal', (err, stat) => {
				if (err) {
					throw err;
				} else if (stat.size > 500e6) {
					db.pragma('wal_checkpoint(RESTART)');
				}
			});
		}, 5000).unref();

		return db;
	}

