import {
	type DataType,
	type StreamKey,
	type StreamType,
	type Progress,
	type Metadata
} from '../types';

/**
 * RemoteStream class that provides an async iterator interface for streaming data
 * from the backend through Electron's IPC mechanism. It manages the stream state,
 * buffers incoming data, and allows for cancellation of the stream.
 */
export default class RemoteStream {
	private buf: DataType[] = [];
	private key: StreamKey;
	type: StreamType;
	progress: Progress;

	static async create(
		type: StreamType,
		args: { filename?: string, file?: Metadata }
	): Promise<RemoteStream> {
		const key = await RemoteStream.startStream(type, args);
		const stream = new RemoteStream(key);

		return stream;
	}

	private static async startStream(
		type: StreamType,
		args: { filename?: string, file?: Metadata }
	): Promise<StreamKey> {
		if (type === "Metadata") {
			return window.electron.stream.start(type);
		} else {
			return window.electron.stream.start(type, args.file);
		}
	}

	private constructor(key: StreamKey) {
		this.type = key.type;
		this.key = key;
		this.progress = {
			done: false,
			rows: 0,
			bytesRead: 0,
			totalBytes: 0
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

	/**
	 * Cancels the stream by sending a cancel request to the backend through Electron's
	 * IPC mechanism. It checks if the stream is not already marked as done, and if so,
	 * it sends the cancel request using the stream key and updates the progress to mark
	 * it as done.
	 */
	cancel() {
		if (!this.progress.done) {
			window.electron.stream.cancel(this.key);
			this.progress.done = true;
		}
	}

	/**
	 * Checks if the stream is done by returning the value of the done property from the
	 * progress object.
	 */
	isDone() {
		return this.progress.done;
	}

	/**
	 * Reads the next chunk of data from the stream. If the buffer is empty and the stream
	 * is not done, it sends a pull request to the backend to fetch more data. It then
	 * returns the next item from the buffer, or null if the buffer is still empty.
	 */
	private async read(): Promise<DataType | null> {
		if (this.key === undefined) {
			throw new Error("Stream not initialized");
		}

		if (this.buf.length === 0 && !this.progress.done) {
			await window.electron.stream.pull(this.key, 1);
		}

		return this.buf.shift() ?? null;
	}

	/**
	 * Implements the async iterator protocol, allowing the RemoteStream to be used in a
	 * for-await-of loop. It continuously reads data from the stream using the read()
	 * method and yields each item until the stream is marked as done and there are no
	 * more items to read.
	 */
	async *[Symbol.asyncIterator]() {
		while (true) {
			const value = await this.read();
			if (value === null) {
				break;
			}

			yield value;
		}
	}

	/**
	 * Utility method to fetch the next item from the stream. This can be used to manually
	 * pull data from the stream without using a for-await-of loop, allowing you to have
	 * more control over when data is pulled and how progress is updated.
	 */
	async next(): Promise<IteratorResult<DataType>> {
		return this[Symbol.asyncIterator]().next();
	}

	/**
	 * Utility method to collect all data from the stream into a single array. This is
	 * useful for testing or when you want to consume the entire stream at once. Note that
	 * this will load all data into memory, so it should be used with caution for large
	 * datasets.
	 */
	async collect<T extends DataType>(): Promise<T[]> {
		const results: DataType[] = [];
		for await (const row of this) {
			results.push(row);
		}
		return results as T[];
	}
}
