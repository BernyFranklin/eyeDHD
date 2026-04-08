import { type Database, default as Sqlite3DB } from 'better-sqlite3';
import fs from 'fs';

import DataStream, { type DataType, type StreamType, type StreamKey, type Progress } from './DataStream';
import caseDataActions, { type CaseData, type CaseDataUpdate, csvOutputPath, createCaseDataTable } from './tables/CaseData';

import userActions, { type UserData, createUserTable } from './tables/UserData';

type DBOptions = {
	logging?: boolean;
	temporary?: boolean;
	path?: string;
};

type UserActions = {
	read: () => UserData;
	update: (user: UserData, updates: Partial<UserData>) => UserData;
}

type CaseDataActions = {
	create: (filename: string, filepath: string) => CaseData;
	read: (filename: string) => CaseData;
	exists: (filename: string) => boolean;
	update: (trial: CaseData, updates: CaseDataUpdate) => CaseData;
	resetCleaning: (trial: CaseData) => CaseData;
	remove: (trial: CaseData) => CaseData;
};

/**
 * DatabaseManager class that manages the SQLite database connection, provides methods
 * for interacting with the casedata, csv, and saccade tables, and handles data streaming
 * through DataStream instances.
 *
 * It also manages DataCleaner instances for each opened file to perform data cleaning
 * operations.
 */
export default class DatabaseManager {
	private db: Database;
	private streams = new Map<number, DataStream>();
	private streamCounter = 0;

	actions: {
		user: UserActions;
		case: CaseDataActions;
	};

	constructor(options: DBOptions = { logging: false, temporary: false }) {
		this.db = getDB(options);

		createUserTable(this.db);
		if (!userActions.exists(this.db)) {
			userActions.create(this.db);
		}

		createCaseDataTable(this.db);

		this.actions = {
			case: {
				create: (filename: string, filepath: string) => caseDataActions.create(this.db, filename, filepath),
				exists: (filename: string) => caseDataActions.exists(this.db, filename),
				read: (filename: string) => caseDataActions.read(this.db, filename),
				update: (trial: CaseData, updates: CaseDataUpdate) => caseDataActions.update(this.db, trial, updates),
				resetCleaning: (trial: CaseData) => {
					const cleanedPath = csvOutputPath(trial);
					if (fs.existsSync(cleanedPath)) {
						fs.unlinkSync(cleanedPath);
					}

					return caseDataActions.update(this.db, trial, {
						cleaned_rows: 0,
						tasks: { cleaning: false }
					});
				},
				remove: (trial: CaseData) => caseDataActions.remove(this.db, trial)
			},

			user: {
				read: () => userActions.read(this.db),
				update: (user: UserData, updates: Partial<UserData>) => userActions.update(this.db, user, updates)
			}
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

		this.db.close();
	}

	/**
	 * Creates a case entry and returns its casedata. If the case already exists, it
	 * reads the existing metadata from the database. For new cases, it initializes
	 * metadata and any required tables.
	 */
	createCase(filename: string, filepath: string): CaseData {
		if (this.actions.case.exists(filename)) {
			return caseDataActions.read(this.db, filename);
		}

		const trial = caseDataActions.create(this.db, filename, filepath);

		return trial;
	}

	/**
	 * Starts a new data stream of the specified type for the given file (if applicable).
	 * It creates a new DataStream instance, stores it in the streams map with a unique
	 * key, and returns the key to the caller for future reference.
	 */
	async startStream(type: StreamType, trial?: CaseData): Promise<StreamKey> {
		const stream = new DataStream(type, trial).start(this);

		const key = { id: ++this.streamCounter, type };
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
			const { value, done } = await stream.next();
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
