import { type Database, default as Sqlite3DB } from 'better-sqlite3';
import fs from 'fs';

import DataCleaner from '../analysis/DataCleaner';
import DataStream, { type DataType, type StreamType, type StreamKey, type Progress } from './DataStream';
import metadataActions, { type Metadata, createMetadataTable } from './tables/metadata';
import csvActions, { type CSVData, createCSVTable, deleteCSVTable } from './tables/csv';
import saccadeActions, { type SaccadeData, createSaccadeTable, deleteSaccadeTable } from './tables/saccade';

type DBOptions = {
	logging: boolean;
	temporary: boolean;
	path?: string;
};

type MetadataActions = {
	read: (filename: string) => Metadata;
	exists: (filename: string) => boolean;
	update: (file: Metadata, updates: Partial<Metadata>) => Metadata;
	resetCleaning: (file: Metadata) => void;
	resetAnalysis: (file: Metadata) => void;
	remove: (file: Metadata) => Metadata;
};

type CSVActions = {
	store: (file: Metadata, rows: CSVData[]) => void;
};

type SaccadeDataActions = {
	store: () => void;
};

/**
 * DatabaseManager class that manages the SQLite database connection, provides methods
 * for interacting with the metadata, csv, and saccade tables, and handles data streaming
 * through DataStream instances.
 *
 * It also manages DataCleaner instances for each opened file to perform data cleaning
 * operations.
 */
export default class DatabaseManager {
	private db: Database;
	private cleaners = new Map<string, DataCleaner>();
	private streams = new Map<number, DataStream>();

	metadata: MetadataActions;
	csv: CSVActions;
	saccade: SaccadeDataActions;

	constructor(options: DBOptions = { logging: false, temporary: false }) {
		this.db = getDB(options);
		createMetadataTable(this.db);

		this.metadata = {
			exists: (filename: string) => metadataActions.exists(this.db, filename),
			read: (filename: string) => metadataActions.read(this.db, filename),
			update: (file: Metadata, updates: Partial<Metadata>) => metadataActions.update(this.db, file, updates),
			resetCleaning: (file: Metadata) => {
				this.resetCleaner(file);
				deleteCSVTable(this.db, file.name);
				createCSVTable(this.db, file.name);

				return metadataActions.update(this.db, file, {
					completed: 0,
					rows: 0
				});
			},
			resetAnalysis: (file: Metadata) => {
				deleteSaccadeTable(this.db, file.name);
				createSaccadeTable(this.db, file.name);
			},
			remove: (file: Metadata) => metadataActions.remove(this.db, file)
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
			store: () => {}
		};
	}

	/**
	 * Closes the database connection and all active streams and cleaners. This should be
	 * called when the application is shutting down to ensure all resources are properly
	 * released.
	 */
	close() {
		for (const [key, stream] of this.streams.entries()) {
			stream.close();
			this.streams.delete(key);
		}

		for (const cleaner of this.cleaners.values()) {
			cleaner.close();
		}
		this.cleaners.clear();

		this.db.close();
	}

	/**
	 * Opens a CSV file and returns its metadata. If the file has been opened before, it
	 * reads the existing metadata from the database. If the file is new, it creates a
	 * new metadata entry, initializes a DataCleaner for the file, and creates the
	 * necessary tables for storing cleaned data and analysis results.
	 */
	openFile(filename: string, filepath: string): Metadata {
		if (this.metadata.exists(filename)) {
			const metadata = metadataActions.read(this.db, filename);
			if (!metadata.completed) {
				this.metadata.resetCleaning(metadata);
			}
			this.createCleaner(metadata);

			return metadata;
		}

		const metadata = metadataActions.create(this.db, filename, filepath);

		this.createCleaner(metadata);
		createCSVTable(this.db, metadata.name);
		createSaccadeTable(this.db, metadata.name);

		return metadata;
	}

	/**
	 * Creates a new DataCleaner instance for the specified file and stores it in the
	 * cleaners map.
	 */
	private createCleaner(file: Metadata) {
		const cleaner = new DataCleaner({ path: file.path });
		this.cleaners.set(file.name, cleaner);
	}

	/**
	 * Resets the DataCleaner for the specified file by deleting the existing cleaner and
	 * creating a new one. This is used when the cleaning progress is reset for a file.
	 */
	private resetCleaner(file: Metadata) {
		this.cleaners.delete(file.name);
		this.createCleaner(file);
	}

	/**
	 * Retrieves the DataCleaner instance for the specified file from the cleaners map.
	 */
	getCleaner(file: Metadata): DataCleaner {
		return this.cleaners.get(file.name);
	}

	/**
	 * Starts a new data stream of the specified type for the given file (if applicable).
	 * It creates a new DataStream instance, stores it in the streams map with a unique
	 * key, and returns the key to the caller for future reference.
	 */
	async startStream(type: StreamType, file?: Metadata): Promise<StreamKey> {
		const stream = DataStream.new(this, type, file);
		const key = { id: Date.now(), type };
		this.streams.set(key.id, stream);

		return key;
	}

	/**
	 * Retrieves the DataStream instance associated with the specified key from the
	 * streams map. This is used when pulling data from an active stream or when
	 * canceling a stream.
	 */
	getStream(key: StreamKey): DataStream {
		return this.streams.get(key.id);
	}

	/**
	 * Pulls the next batch of data from the stream associated with the specified key. It
	 * retrieves the stream, checks if it is still active, and then iteratively calls the
	 * stream's next() method to fetch data until the requested count is reached or the
	 * stream is done. The fetched data and the current progress are sent back to the
	 * caller through the provided send callback function.
	 */
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
			send([], stream.progress);
			return;
		}

		const rows: DataType[] = [];

		for (let i = 0; i < count; i++) {
			const { value, done } = await stream.next(this);
			if (done) {
				break;
			}

			rows.push(...(value ?? []));
		}

		send(rows, stream.progress);
	}

	/**
	 * Cancels an active stream associated with the specified key. It retrieves the
	 * stream, calls its close() method to release any resources, and then removes it
	 * from the streams map.
	 */
	cancelStream(key: StreamKey) {
		const stream = this.getStream(key);
		if (stream) {
			stream.close();
		}
		this.streams.delete(key.id);
	}
}

/**
 * Helper function to create and configure the SQLite database connection. It supports
 * both in-memory databases for testing and file-based databases for production use. It
 * also sets up a periodic check to manage the size of the WAL file when using file-based
 * databases.
 */
export function getDB(options: DBOptions = { logging: false, temporary: false }) {
	if (options.temporary) {
		const db = new Sqlite3DB(':memory:', options.logging ? { verbose: console.log } : {});
		return db;
	}

	if (!options.path) {
		throw new Error('Database path not provided');
	}
	console.log(`Using database at ${options.path}`);

	const db = new Sqlite3DB(options.path, options.logging ? { verbose: console.log } : {});

	db.pragma('journal_mode = WAL');

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
