import { DataType, StreamType } from "./DatabaseManager";

export type Progress = {
	done: boolean;
	rows: number;
	bytesRead?: number;
	totalBytes?: number;
};

/**
 * Wraps a batch iterator and tracks stream progress by batch size.
 */
export default class DataStream {
	type: StreamType;
	iterator: AsyncIterator<DataType[]>;
	progress: Progress = {
		done: false,
		rows: 0
	};

	private wrappedIterator: AsyncIterator<DataType[]>;

	constructor(type: StreamType, iterator: AsyncIterator<DataType[]>) {
		this.type = type;
		this.iterator = iterator;
		this.wrappedIterator = this[Symbol.asyncIterator]();
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
		const iteratorWithReturn = this.iterator as AsyncIterator<DataType[]> & {
			return?: () => Promise<IteratorResult<DataType[]>>;
		};
		if (iteratorWithReturn.return) {
			void iteratorWithReturn.return();
		}
	}

	async collect() {
		const allData: DataType[] = [];
		for await (const batch of this) {
			allData.push(...batch);
		}
		return allData;
	}

	async next(): Promise<IteratorResult<DataType[]>> {
		return await this.wrappedIterator.next();
	}
}