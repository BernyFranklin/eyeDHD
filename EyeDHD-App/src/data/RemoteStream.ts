import {
	type DataType,
	type StreamKey,
	type StreamType,
	type Progress,
	type Metadata
} from '../types';

export default class RemoteStream {
	private buf: DataType[] = [];
	private key: StreamKey;
	type: StreamType;
	progress: Progress;

	static async create(
		type: StreamType,
		args: { filename?: string, file?: Metadata }
	): Promise<RemoteStream> {
		let key;
		if (type === "Metadata") {
			key = await window.electron.stream.start(type);
		} else {
			key = await window.electron.stream.start(type, args.file);
		}
		const stream = new RemoteStream(key);

		return stream;
	}

	constructor(key: StreamKey) {
		this.type = key.type;
		this.key = key;
		this.progress = {
			done: false,
			rows: 0
		};

		window.renderer.stream.onData((key, rows, progress) => {
			if (key.id === this.key.id) {
				this.progress = progress;

				if (this.progress.done) {
					this.cancel();
				}

				this.buf.push(...rows);
			}
		});
	}

	cancel() {
		if (!this.progress.done) {
			window.electron.stream.cancel(this.key);
			this.progress.done = true;
		}
	}

	isDone() {
		return this.progress.done;
	}

	private async read(): Promise<DataType | null> {
		if (this.key === undefined) {
			throw new Error("Stream not initialized");
		}

		if (this.buf.length === 0 && !this.progress.done) {
			await window.electron.stream.pull(this.key, 1);
		}

		return this.buf.shift() ?? null;
	}

	async *[Symbol.asyncIterator]() {
		while (true) {
			const value = await this.read();
			if (value === null) {
				break;
			}

			yield value;
		}
	}

	async next(): Promise<IteratorResult<DataType>> {
		return this[Symbol.asyncIterator]().next();
	}

	async collect(): Promise<DataType[]> {
		const results: DataType[] = [];
		for await (const row of this) {
			results.push(row);
		}
		return results;
	}
}
