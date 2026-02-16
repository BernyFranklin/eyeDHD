import { type Database, default as Sqlite3DB } from 'better-sqlite3';
import fs from 'fs';

import DataCleaner from '../analysis/DataCleaner';
import DataStream, { type Progress } from './DataStream';
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
	read: (filename: string) => Metadata;
	exists: (filename: string) => boolean;
	resetCleaning: (file: Metadata) => void;
	resetAnalysis: (file: Metadata) => void;
	remove: (file: Metadata) => Metadata;
};

// Public functionality available for CSV Data
type CSVActions = {
	store: (file: Metadata, rows: CSVData[]) => void;
};

// Public functionality available for Saccade Data
type SaccadeDataActions = {
	store: () => void;
};

export type DataType = Metadata | CSVData | SaccadeData;
export type StreamType = "Metadata" | "CSVData" | "SaccadeData" | "Cleaning";
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
	private streams = new Map<number, DataStream>();

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
			exists: (filename: string) => {
				return metadataActions.exists(this.db, filename);
			},
			read: (filename: string) => {
				return metadataActions.read(this.db, filename);
			},
			resetCleaning: (file: Metadata) => {
				this.resetCleaner(file);
				this.deleteCSVTable(file);
				this.createCSVTable(file);

				this.updateMetadata({
					...file,
					completed: 0,
					rows: 0
				});
			},
			resetAnalysis: (file: Metadata) => {
				this.deleteSaccadeTable(file);
				this.createSaccadeTable(file);
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
			}
		};

		this.saccade = {
			store: () => {

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
	openFile(filename: string, filepath: string): Metadata {
		if (this.metadata.exists(filename)) {
			const metadata = metadataActions.read(this.db, filename);
			if (!metadata.completed) {
				this.metadata.resetCleaning(metadata);
			}
			this.createCleaner(metadata);

			return metadata;
		} else {
			const metadata = metadataActions.create(this.db, filename, filepath);

			this.createCleaner(metadata);
			this.createCSVTable(metadata);
			this.createSaccadeTable(metadata);

			return metadata;
		}
	}

	// Private helper functions

	/**
   *
   */
	private updateMetadata(updates: Metadata): Metadata {
		return metadataActions.update(this.db, updates);
	}

	/**
	 * Creates a new data cleaner and stores in in the cleaners map
	 */
	private createCleaner(file: Metadata) {
		const cleaner = new DataCleaner({ path: file.path });

		this.cleaners.set(file.name, cleaner);
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
	private resetCleaner(file: Metadata) {
		this.deleteCleaner(file);
		this.createCleaner(file);
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

	async startStream(type: StreamType, file?: Metadata): Promise<StreamKey> {
		const iterator = this.createIterator(type, file);
		const key = { id: Date.now(), type };
		this.streams.set(key.id, new DataStream(type, iterator));

		return key;
	}

	getStream(key: StreamKey): DataStream {
		return this.streams.get(key.id);
	}

	private deleteStream(key: StreamKey) {
		this.streams.delete(key.id);
	}

	async pullStream(
		key: StreamKey,
		count: number,
		send: (rows: DataType[], progress: Progress) => void
	): Promise<void> {
		const stream = this.getStream(key);
		if (!stream) {
			throw new Error(`No stream found for key: ${key.id}`);
		}

		if (stream.progress.done) {
			return;
		}

		const rows: DataType[] = [];

		for (let i = 0; i < count; i++) {
			const { value, done } = await stream.next();
			if (done) {
				send(rows, stream.progress);
				break;
			}

			rows.push(value);
		}

		send(rows, stream.progress);
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
				if (!file) {
					throw new Error("File must be provided for CSVData streams");
				}

				const sql = csvActions.iterate(file);
		    const stmt = this.db.prepare<[], CSVData>(sql);

		    for (const row of stmt.iterate()) {
		      yield row;
		    }
				break;
			}
			case "SaccadeData": {
				throw new Error("SaccadeData streaming not implemented yet");
				if (!file) {
					throw new Error("File must be provided for Saccade streams");
				}
				break;
			}
			case "Cleaning": {
				let metadata = file;
				const cleaner = this.getCleaner(metadata);
				if (!cleaner) {
					throw new Error(`No cleaner found for file: ${metadata.name}`);
				}

				if (cleaner.status.start) {
					this.metadata.resetCleaning(metadata);
					throw new Error(`Cleaner for file: ${metadata.name} hasn't been started yet`);
				} else {
					const header = cleaner.header.join(',') + '\n';

					metadata = this.updateMetadata({ ...metadata, header });
				}

				for await (const row of cleaner) {
					this.csv.store(file, [row]);
					yield null;
				}

				cleaner.close();
				this.updateMetadata({
					...metadata,
					rows: cleaner.progress.currentRow,
					completed: 1
				});
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