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

export default class DatabaseManager {
	private db: Database;
	private cleaners = new Map<string, DataCleaner>();
	private streams = new Map<number, DataStream>();

	metadata: MetadataActions;
	csv: CSVActions;
	saccade: SaccadeDataActions;

	constructor(options: DBOptions = { logging: false, temporary: false }) {
		this.db = getDB(options);
		this.createMetadataTable();

		this.metadata = {
			exists: (filename: string) => metadataActions.exists(this.db, filename),
			read: (filename: string) => metadataActions.read(this.db, filename),
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

	close() {
		for (const [key, stream] of this.streams.entries()) {
			stream.close();
			this.deleteStream({ id: key, type: stream.type });
		}

		for (const cleaner of this.cleaners.values()) {
			cleaner.close();
		}
		this.cleaners.clear();

		this.db.close();
	}

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
		this.createCSVTable(metadata);
		this.createSaccadeTable(metadata);

		return metadata;
	}

	private updateMetadata(updates: Metadata): Metadata {
		return metadataActions.update(this.db, updates);
	}

	private createCleaner(file: Metadata) {
		const cleaner = new DataCleaner({ path: file.path });
		this.cleaners.set(file.name, cleaner);
	}

	private deleteCleaner(file: Metadata): boolean {
		return this.cleaners.delete(file.name);
	}

	private resetCleaner(file: Metadata) {
		this.deleteCleaner(file);
		this.createCleaner(file);
	}

	getCleaner(file: Metadata): DataCleaner {
		return this.cleaners.get(file.name);
	}

	private createMetadataTable() {
		createMetadataTable(this.db);
	}

	private createCSVTable(file: Metadata) {
		createCSVTable(this.db, file.name);
	}

	private deleteCSVTable(file: Metadata) {
		deleteCSVTable(this.db, file.name);
	}

	private createSaccadeTable(file: Metadata) {
		createSaccadeTable(this.db, file.name);
	}

	private deleteSaccadeTable(file: Metadata) {
		deleteSaccadeTable(this.db, file.name);
	}

	async startStream(type: StreamType, file?: Metadata): Promise<StreamKey> {
		const stream = DataStream.new(this, type, file);
		const key = { id: Date.now(), type };
		this.streams.set(key.id, stream);

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

	cancelStream(key: StreamKey) {
		const stream = this.getStream(key);
		if (stream) {
			stream.close();
		}
		this.deleteStream(key);
	}

}

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
