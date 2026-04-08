import fs from "fs";
import rl from "readline";

import { spawn } from 'child_process';
import FFMPEG_PATH from 'ffmpeg-static';

import gl from "gl";
import * as Three from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { TRACKING_DATA_HEADERS, type TrackingData, fromCSV, toCSV } from "./tables/TrackingData";
import caseDataActions, { animationOutputPath, type CaseData, csvImportPath, csvOutputPath } from "./tables/CaseData";
import DatabaseManager from "./DatabaseManager";
import DataCleaner from "@electron/analysis/DataCleaner";

export type DataType = CaseData | TrackingData;
export type StreamType = 'CaseData' | 'TrackingData' | 'Cleaning';
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
const BATCH_SIZE = 1000;

/**
 * DataStream class that provides an async iterator interface for streaming data
 * from the database.
 */
export default class DataStream {
	type: StreamType;
	trial?: CaseData;
	path?: string;
	iterator: AsyncIterator<DataType[]>;
	progress: Progress = {
		done: false,
		rows: 0,
		bytesRead: 0,
		totalBytes: 0
	};

	constructor(
		type: StreamType,
		trial?: CaseData
	) {
		this.type = type;
		this.trial = trial;
		this.path = undefined;
		this.iterator = undefined;
	}

	start(manager: DatabaseManager) {
		this.iterator = DataStream.createIterator(this, manager);
		return this;
	}

	/**
	 * Static method to create a test DataStream instance with a provided async iterator.
	 */
	static testStream(
		type: StreamType,
		iterator: AsyncIterator<DataType[]>,
		trial?: CaseData
	): DataStream {
		const stream = new DataStream(type, trial);
		stream.iterator = iterator;
		return stream;
	}

	/**
	 * Private static method to create an async iterator based on
	 * the stream type and file.
	 */
	private static async *createIterator(
		self: DataStream,
		manager: DatabaseManager
	): AsyncGenerator<DataType[], void, undefined> {
		// We switch on the `type` to determine which iterator code to run
		//
		// For each stream type, we create an async iterator that yields batches of data
		// until all data has been streamed.
		//
		// The batch size is determined by the STREAM_BATCH_SIZE constant.
		switch (self.type) {
			case 'CaseData': {
				yield* DataStream.caseDataIterator(manager);
				break;
			}

			case 'TrackingData': {
				if (!self.trial) {
					throw new Error('File must be provided for CSVData streams');
				}

				yield* DataStream.csvDataIterator(self.trial);
				break;
			}

			case 'Cleaning': {
				if (!self.trial) {
					throw new Error('File must be provided for CSVData streams');
				}

				yield* DataStream.cleaningIterator(self, manager);
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
		const stmt = caseDataActions.iterate(manager['db']);

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
	 * Private static method to create an async iterator for streaming cleaned CSV data
	 * for a given file.
	 */
	private static async *csvDataIterator(
		trial: CaseData
	): AsyncGenerator<DataType[], void, undefined> {
		const cleanedPath = csvOutputPath(trial);
		if (!fs.existsSync(cleanedPath)) {
			throw new Error(`Cleaned CSV not found for file: ${trial.name}`);
		}

		const stream = fs.createReadStream(cleanedPath, { encoding: 'utf-8' });
		const reader = rl.createInterface({ input: stream, crlfDelay: Infinity });
		const iter = reader[Symbol.asyncIterator]();

		try {
			// Skip header row
			await iter.next();

			let batch: TrackingData[] = [];
			for await (const line of iter) {
				const data = fromCSV(line);
				batch.push(data);

				if (batch.length >= STREAM_BATCH_SIZE) {
					yield batch;
					batch = [];
				}
			}

			if (batch.length > 0) {
				yield batch;
			}
		} finally {
			reader.close();
			stream.close();
		}
	}

	/**
	 * Private static method to create an async iterator for streaming cleaned CSV data
	 * for a given file. It uses the cleaner's async iterator to read and clean the data
	 * on-the-fly, yielding batches of cleaned data and updating the case data progress as
	 * we go.
	 */
	private static async *cleaningIterator(
		self: DataStream,
		manager: DatabaseManager
	): AsyncGenerator<DataType[], void, undefined> {
		self.trial = manager.actions.case.resetCleaning(self.trial);
		const cleaner = new DataCleaner({ path: csvImportPath(self.trial) });
		await cleaner.ready();

		const outputPath = csvOutputPath(self.trial);
		const outputStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

		const header = TRACKING_DATA_HEADERS.join(',') + '\n';
		outputStream.write(header);
		self.trial = manager.actions.case.update(self.trial, { header });

		let batch: TrackingData[] = [];
		for await (const row of cleaner) {
			batch.push(row);

			self.progress.bytesRead = cleaner.progress.bytesRead;
			self.progress.totalBytes = cleaner.progress.totalBytes;
			self.progress.rows++;

			const line = toCSV(row) + '\n';
			outputStream.write(line);

			if (batch.length >= BATCH_SIZE) {
				yield batch;
				batch = [];
			}
		}

		if (batch.length > 0) {
			yield batch;
		}

		cleaner.close();

		// End writing stream and wait for it to complete
		await new Promise<void>((resolve, reject) => {
			outputStream.once('error', reject);
			outputStream.once('finish', resolve);
			outputStream.end();
		});

		// Set output file to read-only
		try {
			await fs.promises.chmod(outputPath, 0o444);
		} catch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
		}

		self.trial = manager.actions.case.update(self.trial, {
			cleaned_rows: cleaner.progress.currentRow,
			tasks: {
				cleaning: true
			}
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
	async next(): Promise<IteratorResult<DataType[]>> {
		const result = await this.iterator.next();
		const { done, value } = result;

		if (done) {
			this.close();
			return result;
		}

		const batch = value ?? [];
		this.progress.rows += batch.length;

		return result;
	}
}
