import { DataType, StreamType } from "./DatabaseManager";

export type Progress = {
	done: boolean;
	rows: number;
}

/**
	*
	*/
export default class DataStream {
	type: StreamType;
	iterator: AsyncIterator<DataType>;
	progress: Progress = {
		done: false,
		rows: 0
	};

	constructor(type: StreamType, iterator: AsyncIterator<DataType>) {
		this.type = type;
		this.iterator = iterator;
	}

	async *[Symbol.asyncIterator]() {
		while (true) {
			const { done, value } = await this.iterator.next();
			if (done) {
				this.progress.done = true;
				break;
			}

			this.progress.rows++;
			yield value;
		}
	}

	async next(): Promise<IteratorResult<DataType>> {
		return await this.iterator.next();
	}
}