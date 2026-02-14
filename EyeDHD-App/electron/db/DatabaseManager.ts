import { type Database, default as Sqlite3DB } from 'better-sqlite3';
import fs from 'fs';

import DataCleaner from '../analysis/DataCleaner';
import metadataActions, { type Metadata, createMetadataTable } from './tables/metadata';
import csvActions, { type CSVData, createCSVTable, deleteCSVTable } from './tables/csv';
import saccadeActions, { type SaccadeData, createSaccadeTable, deleteSaccadeTable } from './tables/saccade';


// Database configuration options
type DBOptions = {
	logging: boolean;
	temporary: boolean;
	path?: string;
};

// Database action types defining the public-facing API for interacting with the database

// Public functionality available for Metadata
type MetadataActions = {
	create: (filename: string, filepath: string) => void;
	exists: (filename: string) => boolean;
	read: (filename: string) => Metadata;
	readAll: () => Metadata[];
	resetCleaning: (file: Metadata) => void;
	resetReading: (file: Metadata) => void;
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

export type DataType = Metadata | CSVData | SaccadeData;
export type StreamType = "Metadata" | "CSVData" | "SaccadeData";
export type StreamKey = {
	id: number,
	type: StreamType

}

/**
 * Database Manager responsible for handling all database requests
 * and managing data streams sent to the frontend
 */
export default class DatabaseManager {
	private db: Database;
	private cleaners = new Map<string, DataCleaner>();
	private streams = new Map<number, AsyncIterator<DataType>>();


	// These fields contain the public API for interacting with the database
	// TODO: make these private and use streams for getting data
	metadata: MetadataActions;
	csv: CSVActions;
	saccade: SaccadeDataActions;

	constructor(options: DBOptions = { logging: false, temporary: false }) {
		this.db = getDB(options);
		this.createMetadataTable();

		// Initialize the public API for interacting with the database

		this.metadata = {
			create: (filename: string, filepath: string) => {
				const metadata = metadataActions.create(
					this.db,
					filename,
					filepath
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
			resetCleaning: (file: Metadata) => {
				this.updateMetadata({
					...file,
					requested: 0,
					cleaned: 0,
					completed: 0,
					first_frame: 0,
					last_frame: 0
				});
			},
			resetReading: (file: Metadata) => {
				this.updateMetadata({ ...file, requested: 0 });
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
				const rows = csvActions.read(this.db, file);
				if (rows === undefined) {
					throw new Error(`Failed to read cleaned rows for file: ${file.name}`);
				}

				this.updateMetadata({
					...file,
					requested: file.requested + rows.length
				});

				return rows;
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
	openFile(filename: string, filepath: string) {
		if (this.metadata.exists(filename)) {
			const metadata = this.metadata.read(filename);
			if (!this.cleanerExists(metadata)) {
				this.resetCleaner(metadata);
			}
		} else {
			this.metadata.create(filename, filepath);
			const metadata = this.metadata.read(filename);
			const cleaner = this.getCleaner(metadata);

			if (metadata.request_size != cleaner.buf_len) {
				this.updateMetadata({
					...metadata,
					request_size: cleaner.buf_len
				})
			}
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
					this.updateMetadata({
						...metadata,
						header: cleaner.header.join(',') + '\n',
						first_frame: buffer?.[0].Frame
					});

					metadata = this.metadata.read(metadata.name);
				}

				while (buffer) {
					this.csv.store(metadata, buffer);

					this.updateMetadata({
						...metadata,
						last_frame: buffer[buffer.length - 1].Frame,
						cleaned: (metadata.cleaned += buffer.length)
					});

					buffer = await cleaner.getBuffer();
					metadata = this.metadata.read(metadata.name);
				}

				this.updateMetadata({ ...metadata, completed: 1 });
				cleaner.close();

				return resolve();
			} catch (err) {
				return reject(`Failed to clean file: ${err}`);
			}
		});
	}

	// Private helper functions


	/**
   *
   */
	private updateMetadata(updates: Metadata) {
		const ok = metadataActions.update(this.db, updates);
		if (!ok) {
			throw new Error(`Failed to update metadata for file: ${updates.name}`);
		}
	}

	/**
	 * Creates a new data cleaner and stores in in the cleaners map
	 */
	private setCleaner(file: Metadata) {
		this.cleaners.set(file.name, new DataCleaner({
			dbmgr: this,
			name: file.name,
			path: file.path
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

	/**
	 * Creates a new table for storing progress data for a given file
	 */
	private createProgressTable(file: Metadata) {

	}

	/**
	 * Deletes the progress data table for a given file
	 */
	private deleteProgressTable(file: Metadata) {

	}

	async startStream(type: StreamType, file?: Metadata): Promise<StreamKey> {
		const iterator = this.createIterator(type, file);
		const key = { id: Date.now(), type };
		this.streams.set(key.id, iterator);

		return key;
	}

	private getStream(key: StreamKey): AsyncIterator<DataType> {
		return this.streams.get(key.id);
	}

	private deleteStream(key: StreamKey) {
		this.streams.delete(key.id);
	}

	async pullStream(
		key: StreamKey,
		count: number,
		send: (rows: DataType[]) => void
	): Promise<{ done: boolean }> {
		const iterator = this.getStream(key);
		if (!iterator) {
			throw new Error(`No stream found for key: ${key.id}`);
		}

		const rows: DataType[] = [];

		for (let i = 0; i < count; i++) {
			const { value, done } = await iterator.next();
			if (done) {
				this.deleteStream(key);
				send(rows);
				return { done: true };
			}

			rows.push(value);
		}

		send(rows);
		return { done: false };
	}

	cancelStream(key: StreamKey) {
		this.deleteStream(key);
	}

	private async *createIterator(
		type: StreamType,
		file?: Metadata
	): AsyncIterator<DataType> {
    switch (type) {
			case "Metadata": {
				const sql = metadataActions.iterate();
		    const stmt = this.db.prepare<[], Metadata>(sql);

		    for (const row of stmt.iterate()) {
		      yield row;
		    }
				break;
			}
			case "CSVData": {
				const sql = csvActions.iterate(file);
		    const stmt = this.db.prepare<[], CSVData>(sql);

		    for (const row of stmt.iterate()) {
		      yield row;
		    }
				break;
			}
			case "SaccadeData": {
				throw new Error("SaccadeData streaming not implemented yet");
				break;
			}

		}
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

