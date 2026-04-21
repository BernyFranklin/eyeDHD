import {
	type DataType,
	type StreamKey,
	type StreamType,
	type Progress,
	type CaseData
} from './types';

// Fire the next pull as soon as buf drops below this many rows.
// At ~266 rows/sec consumption and ~1500ms per pull (observed on Windows),
// this gives ~1.9s of runway — enough to overlap the next fetch.
const PREFETCH_THRESHOLD = 500;

// Batches per pull request. One batch = STREAM_BATCH_SIZE rows on the main side.
const PULL_COUNT = 1;

/**
 * RemoteStream class that provides an async iterator interface for streaming data
 * from the backend through Electron's IPC mechanism. It manages the stream state,
 * buffers incoming data, and allows for cancellation of the stream.
 *
 * Callback-driven prefetch: the next pull is fired from the stream:data arrival
 * handler (chaining) and kickstarted from the constructor, with read() also
 * poking maybePrefetch() to cover the case where buf drops below threshold
 * purely via consumption. At most one pull is in flight at a time.
 */
export default class RemoteStream {
	private buf: DataType[] = [];
	private waiter: (() => void) | null = null;
	private key: StreamKey;
	private onDataCallback: ((key: StreamKey, rows: DataType[], progress: Progress) => void) | null = null;
	private pullInFlight = false;
	private pullError: Error | null = null;
	type: StreamType;
	progress: Progress;

	static async create(
		type: StreamType,
		args: { filename?: string, trial?: CaseData }
	): Promise<RemoteStream> {
		const key = await RemoteStream.startStream(type, args);
		const stream = new RemoteStream(key);

		return stream;
	}

	private static async startStream(
		type: StreamType,
		args: { filename?: string, trial?: CaseData }
	): Promise<StreamKey> {
		if (type === "CaseData") {
			return window.electron.stream.start(type);
		} else {
			return window.electron.stream.start(type, args.trial);
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

		this.onDataCallback = (key, rows, progress) => {
			if (key.id !== this.key.id) {
				return;
			}

			this.progress = progress;

			if (this.progress.done) {
				this.cancel();
			}

			if (rows.length > 0) {
				this.buf.push(...rows);
			}

			// Clear pullInFlight here (not in the invoke .finally). The
			// invoke reply can arrive after the for-await consumer has
			// already drained the entire batch via chained microtasks,
			// which would leave pullInFlight=true for long enough to
			// suppress the next prefetch and deadlock. Each pull produces
			// exactly one stream:data message, so pairing it here is safe.
			this.pullInFlight = false;

			if (!this.progress.done) {
				this.maybePrefetch();
			}

			this.resolveWaiter();
		};
		window.renderer.stream.onData(this.onDataCallback);

		this.maybePrefetch();
	}

	/**
	 * Fires the next pull if we're not already waiting on one, the stream isn't
	 * done, and buf has dropped below the prefetch threshold. Fire-and-forget;
	 * the stream:data event is what actually populates buf.
	 */
	private maybePrefetch() {
		if (this.pullInFlight) {
			return;
		}
		if (this.progress.done) {
			return;
		}
		if (this.buf.length >= PREFETCH_THRESHOLD) {
			return;
		}

		this.pullInFlight = true;

		window.electron.stream.pull(this.key, PULL_COUNT)
			.catch((err: Error) => {
				this.pullError = err;
				// Clear on error too so a retry path could re-prefetch.
				// Normal success path clears pullInFlight in onDataCallback.
				this.pullInFlight = false;
				this.resolveWaiter();
			});
	}

	private resolveWaiter() {
		if (!this.waiter) {
			return;
		}

		this.waiter();
		this.waiter = null;
	}

	private waitForData(): Promise<void> {
		if (this.buf.length > 0 || this.progress.done) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			this.waiter = resolve;
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

		if (this.onDataCallback) {
			window.renderer.stream.offData(this.onDataCallback);
			this.onDataCallback = null;
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
	 * Reads the next item from the stream. Does not fire pulls directly — pulls
	 * are triggered by the constructor (first pull) and onDataCallback (chain);
	 * read() only pokes maybePrefetch() to cover the drain-below-threshold case
	 * and otherwise waits for data to arrive.
	 */
	private async read(): Promise<DataType | null> {
		if (this.key === undefined) {
			throw new Error("Stream not initialized");
		}

		if (this.pullError) {
			const err = this.pullError;
			this.pullError = null;
			throw err;
		}

		// If consumption has drained buf below threshold, fire the next pull.
		// No-op if a pull is already in flight.
		this.maybePrefetch();

		while (this.buf.length === 0 && !this.progress.done && !this.pullError) {
			await this.waitForData();
		}

		if (this.pullError) {
			const err = this.pullError;
			this.pullError = null;
			throw err;
		}

		return this.buf.shift() ?? null;
	}

	/**
	 * Drains all currently-buffered rows in a single await. If buf is empty,
	 * awaits the next batch. Returns an empty array when the stream is fully
	 * drained and done.
	 *
	 * Much cheaper in hot loops than the per-row async iterator: one microtask
	 * boundary per ~1000 rows instead of per row, which avoids the macrotask
	 * yield overhead that dominates iterWait in the per-row path.
	 */
	async readBatch(): Promise<DataType[]> {
		if (this.key === undefined) {
			throw new Error("Stream not initialized");
		}

		if (this.pullError) {
			const err = this.pullError;
			this.pullError = null;
			throw err;
		}

		this.maybePrefetch();

		while (this.buf.length === 0 && !this.progress.done && !this.pullError) {
			await this.waitForData();
		}

		if (this.pullError) {
			const err = this.pullError;
			this.pullError = null;
			throw err;
		}

		if (this.buf.length === 0) {
			return [];
		}

		const batch = this.buf;
		this.buf = [];
		return batch;
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
