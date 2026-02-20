import csvActions, { type CSVData } from "./tables/csv";
import metadataActions, { type Metadata } from "./tables/metadata";
import saccadeActions, { type SaccadeData } from "./tables/saccade";
import DatabaseManager from "./DatabaseManager";

export type DataType = Metadata | CSVData | SaccadeData;
export type StreamType = 'Metadata' | 'CSVData' | 'SaccadeData' | 'Cleaning';
export type StreamKey = {
	id: number;
	type: StreamType;
};

export type Progress = {
	done: boolean;
	rows: number;
	bytesRead: number;
	totalBytes: number;
};

const STREAM_BATCH_SIZE = 1000;
const CLEANING_BATCH_SIZE = 1000;

/**
 * Wraps a batch iterator and tracks stream progress by batch size.
 */
export default class DataStream {
	type: StreamType;
	file?: Metadata;
	iterator: AsyncIterator<DataType[]>;
	progress: Progress = {
		done: false,
		rows: 0,
		bytesRead: 0,
		totalBytes: 0
	};

	private constructor(type: StreamType, iterator: AsyncIterator<DataType[]>, file?: Metadata) {
		this.type = type;
		this.iterator = iterator;
		this.file = file;
	}

	static new(manager: DatabaseManager, type: StreamType, file?: Metadata): DataStream {
		const iterator = DataStream.createIterator(manager, type, file);
		const stream = new DataStream(type, iterator, file);

		return stream;
	}

	static createForTest(type: StreamType, iterator: AsyncIterator<DataType[]>, file?: Metadata): DataStream {
		return new DataStream(type, iterator, file);
	}

	private static async *createIterator(
		manager: DatabaseManager,
		type: StreamType,
		file?: Metadata
	): AsyncIterator<DataType[]> {
		switch (type) {
			case 'Metadata': {
				const sql = metadataActions.iterate();
				const stmt = manager['db'].prepare<[], Metadata>(sql);

				let batch: Metadata[] = [];
				for (const row of stmt.iterate()) {
					batch.push(row);
					if (batch.length >= STREAM_BATCH_SIZE) {
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
				const stmt = manager['db'].prepare<[], CSVData>(sql);

				let batch: CSVData[] = [];
				for (const row of stmt.iterate()) {
					batch.push(row);
					if (batch.length >= STREAM_BATCH_SIZE) {
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
				const cleaner = manager.getCleaner(metadata);
				if (!cleaner) {
					throw new Error(`No cleaner found for file: ${metadata.name}`);
				}

				// If progress has been made restart
				if (cleaner.status.start) {
					manager.metadata.resetCleaning(metadata);
				}

				const header = cleaner.header.join(',') + '\n';
				metadata = manager['updateMetadata']({ ...metadata, header });

				let batch: CSVData[] = [];
				for await (const row of cleaner) {
					batch.push(row);

					if (batch.length >= CLEANING_BATCH_SIZE) {
						manager.csv.store(metadata, batch);
						yield batch;
						batch = [];
					}
				}

				if (batch.length > 0) {
					manager.csv.store(metadata, batch);
					yield batch;
				}

				cleaner.close();

				manager['updateMetadata']({
					...metadata,
					rows: cleaner.progress.currentRow,
					completed: 1
				});
				break;
			}
		}
	}

	async *[Symbol.asyncIterator](): AsyncIterator<DataType[]> {
		while (true) {
			const { done, value } = await this.iterator.next();

			if (done) {
				this.close();
				break;
			}

			const batch = value ?? [];
			this.progress.rows += batch.length;

			yield batch;
		}
	}

	close() {
		if (this.progress.done) {
			return;
		}

		this.progress.done = true;
	}

	async collect() {
		const allData: DataType[] = [];
		for await (const batch of this) {
			allData.push(...batch);
		}
		return allData;
	}

	async next(manager: DatabaseManager): Promise<IteratorResult<DataType[]>> {
		const result = await this.iterator.next();
		const { done, value } = result;

		if (done) {
			this.close();
			return result;
		}

		const batch = value ?? [];
		if (this.type === 'Cleaning') {
			const cleaner = manager.getCleaner(this.file);
			if (cleaner) {
				this.progress.bytesRead = cleaner.progress.bytesRead;
				this.progress.totalBytes = cleaner.progress.totalBytes;
			}
		} else {
			this.progress.rows += batch.length;
		}

		return result;
	}
}
