import csvActions, { type CSVData } from "./tables/CSVData";
import metadataActions, { type CaseData } from "./tables/CaseData";
import DatabaseManager from "./DatabaseManager";

export type DataType = CaseData | CSVData;
export type StreamType = 'CaseData' | 'CSVData' | 'Cleaning';
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
 * DataStream class that provides an async iterator interface for streaming data
 * from the database.
 */
export default class DataStream {
	type: StreamType;
	file?: CaseData;
	iterator: AsyncIterator<DataType[]>;
	progress: Progress = {
		done: false,
		rows: 0,
		bytesRead: 0,
		totalBytes: 0
	};

	/**
	 * Private constructor to enforce the use of the static new method
	 * for creating instances
	 */
	private constructor(
		type: StreamType,
		iterator: AsyncIterator<DataType[]>,
		file?: CaseData
	) {
		this.type = type;
		this.iterator = iterator;
		this.file = file;
	}

	/**
	 * Static method to create a new DataStream instance. It initializes the
	 * async iterator based on the stream type and file (if applicable).
	 */
	static new(manager: DatabaseManager, type: StreamType, file?: CaseData): DataStream {
		const iterator = DataStream.createIterator(manager, type, file);
		const stream = new DataStream(type, iterator, file);

		return stream;
	}

	/**
	 * Static method to create a test DataStream instance with a provided async iterator.
	 */
	static testStream(
		type: StreamType,
		iterator: AsyncIterator<DataType[]>,
		file?: CaseData
	): DataStream {
		return new DataStream(type, iterator, file);
	}

	/**
	 * Private static method to create an async iterator based on
	 * the stream type and file.
	 */
	private static async *createIterator(
		manager: DatabaseManager,
		type: StreamType,
		file?: CaseData
	): AsyncGenerator<DataType[], void, undefined> {
		// We switch on the `type` to determine which iterator code to run
		//
		// For each stream type, we create an async iterator that yields batches of data
		// until all data has been streamed.
		//
		// The batch size is determined by the STREAM_BATCH_SIZE constant.
		switch (type) {
			case 'CaseData': {
				yield* DataStream.caseDataIterator(manager);
				break;
			}

			case 'CSVData': {
				yield* DataStream.csvDataIterator(manager, file);
				break;
			}

			case 'Cleaning': {
				yield* DataStream.cleaningIterator(manager, file);
				break;
			}
		}
	}

	/**
	 * Private static method to create an async iterator for streaming case data.
	 */
	private static async *caseDataIterator(
		manager: DatabaseManager
	): AsyncGenerator<DataType[], void, undefined> {
		const sql = metadataActions.iterate();
		const stmt = manager['db'].prepare<[], CaseData>(sql);

		let batch: CaseData[] = [];
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
	}

	/**
	 * Private static method to create an async iterator for streaming CSV data
	 * for a given file.
	 */
	private static async *csvDataIterator(
		manager: DatabaseManager,
		file?: CaseData
	): AsyncGenerator<DataType[], void, undefined> {
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
	}

	/**
	 * Private static method to create an async iterator for streaming cleaned CSV data
	 * for a given file. It uses the cleaner's async iterator to read and clean the data
	 * on-the-fly, yielding batches of cleaned data and updating the case data progress as
	 * we go.
	 */
	private static async *cleaningIterator(
		manager: DatabaseManager,
		file?: CaseData
	): AsyncGenerator<DataType[], void, undefined> {
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
		metadata = manager.metadata.update(metadata, { header });

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

		manager.metadata.update(metadata, {
			rows: cleaner.progress.currentRow,
			completed: 1
		});
	}

	/**
	 * Implements the async iterator protocol, allowing the DataStream to be used in
	 * for-await-of loops.
	 */
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

	/**
	 * Closes the stream and marks it as done. This can be called to manually close the
	 * stream.
	 */
	close() {
		if (this.progress.done) {
			return;
		}

		this.progress.done = true;
	}

	/**
	 * Utility method to collect all data from the stream into a single array. This is
	 * useful for testing or when you want to consume the entire stream at once. Note
	 * that this will load all data into memory, so it should be used with caution for
	 * large datasets.
	 */
	async collect() {
		const allData: DataType[] = [];
		for await (const batch of this) {
			allData.push(...batch);
		}
		return allData;
	}

	/**
	 * Pulls the next batch of data from the stream and updates the progress. This can be
	 * used to manually pull data from the stream without using a for-await-of loop,
	 * allowing you to have more control over when data is pulled and how progress is
	 * updated.
	 */
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
