import { type Database, default as Sqlite3DB } from 'better-sqlite3';
import fs from 'fs';

import DataCleaner from '../analysis/DataCleaner';
import DataStream, { type Progress } from './DataStream';
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

export type DataType = Metadata | CSVData | SaccadeData;
export type StreamType = 'Metadata' | 'CSVData' | 'SaccadeData' | 'Cleaning';
export type StreamKey = {
	id: number;
	type: StreamType;
};

export default class DatabaseManager {
	private db: Database;
	private cleaners = new Map<string, DataCleaner>();
	private streams = new Map<number, DataStream>();
	private streamContexts = new Map<number, { type: StreamType; file?: Metadata }>();

	private static readonly STREAM_BATCH_SIZE = 1000;
	private static readonly CLEANING_BATCH_SIZE = 1000;

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

	cleanerExists(file: Metadata): boolean {
		return this.cleaners.has(file.name);
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
		const iterator = this.createIterator(type, file);
		const key = { id: Date.now(), type };
		this.streams.set(key.id, new DataStream(type, iterator));
		this.streamContexts.set(key.id, { type, file });

		return key;
	}

	getStream(key: StreamKey): DataStream {
		return this.streams.get(key.id);
	}

	private deleteStream(key: StreamKey) {
		this.streams.delete(key.id);
		this.streamContexts.delete(key.id);
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

		if (stream.type === 'Cleaning') {
			const context = this.streamContexts.get(key.id);
			if (context?.file) {
				const cleaner = this.getCleaner(context.file);
				if (cleaner) {
					stream.progress.bytesRead = cleaner.progress.bytesRead;
					stream.progress.totalBytes = cleaner.progress.totalBytes;
				}
			}
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

	private async *createIterator(type: StreamType, file?: Metadata): AsyncIterator<DataType[]> {
		switch (type) {
			case 'Metadata': {
				const sql = metadataActions.iterate();
				const stmt = this.db.prepare<[], Metadata>(sql);

				let batch: Metadata[] = [];
				for (const row of stmt.iterate()) {
					batch.push(row);
					if (batch.length >= DatabaseManager.STREAM_BATCH_SIZE) {
						yield batch;
						batch = [];
					}
				}

				if (batch.length > 0) {
					yield batch;
				}
				break;
			}

			case 'CSVData': {
				if (!file) {
					throw new Error('File must be provided for CSVData streams');
				}

				const sql = csvActions.iterate(file);
				const stmt = this.db.prepare<[], CSVData>(sql);

				let batch: CSVData[] = [];
				for (const row of stmt.iterate()) {
					batch.push(row);
					if (batch.length >= DatabaseManager.STREAM_BATCH_SIZE) {
						yield batch;
						batch = [];
					}
				}

				if (batch.length > 0) {
					yield batch;
				}
				break;
			}

			case 'SaccadeData': {
				throw new Error('SaccadeData streaming not implemented yet');
			}

			case 'Cleaning': {
				if (!file) {
					throw new Error('File must be provided for Cleaning streams');
				}

				let metadata = file;
				const cleaner = this.getCleaner(metadata);
				if (!cleaner) {
					throw new Error(`No cleaner found for file: ${metadata.name}`);
				}

				// If progress has been made restart
				if (cleaner.status.start) {
					this.metadata.resetCleaning(metadata);
				}

				const header = cleaner.header.join(',') + '\n';
				metadata = this.updateMetadata({ ...metadata, header });

				let batch: CSVData[] = [];
				for await (const row of cleaner) {
					batch.push(row);

					if (batch.length >= DatabaseManager.CLEANING_BATCH_SIZE) {
						this.csv.store(metadata, batch);
						yield batch;
						batch = [];
					}
				}

				if (batch.length > 0) {
					this.csv.store(metadata, batch);
					yield batch;
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