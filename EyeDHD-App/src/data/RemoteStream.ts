import { type DataType, type StreamKey, type StreamType } from "../../electron/db/DatabaseManager";
import { Metadata } from "../../electron/db/tables/metadata";

export default class RemoteStream {
	private buf: DataType[] = [];
	private done = false;
	private key: StreamKey;
	type: StreamType;

	static async create(type: StreamType, args: { filename?: string, file?: Metadata }): Promise<RemoteStream> {
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

		window.renderer.stream.onData((key: StreamKey, rows: DataType[]) => {
			if (key.id === this.key.id) {
				this.buf.push(...rows);
			}
		});

		window.renderer.stream.onEnd((key: StreamKey) => {
			if (key.id === this.key.id) {
				this.done = true;
			}
		});
	}

	isDone() {
		return this.done;
	}

	async read(): Promise<DataType | null> {
		if (this.key === undefined) {
			throw new Error("Stream not initialized");
		}

		if (this.done) {
			return null;
		}

		if (this.buf.length === 0) {
			await window.electron.stream.pull(this.key, 1000);
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
		const value = await this.read();
		if (value === null) {
			return { done: true, value: null };
		}

		return { done: false, value };
	}

	cancel() {
		window.electron.stream.cancel(this.key);
		this.done = true;
	}
}
