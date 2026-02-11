import { ipcRenderer } from "electron";

import { type DataType, type StreamKey, type StreamType } from "../../electron/db/DatabaseManager";
import { Metadata } from "../../electron/db/tables/metadata";

export default class RemoteStream {
	private buf: DataType[] = [];
	private done = false;
	private key: StreamKey;
	type: StreamType;

	constructor(type: StreamType, args: { filename?: string, file?: Metadata }) {
		let key: StreamKey;
		if (type === "Metadata") {
			window.electron.stream.start(type, args.file).then(value => key = value);
		} else {
			let metadata: Metadata;
			window.electron.csv.getMetadata(args.filename).then(value => metadata = value);
			window.electron.stream.start(type, metadata).then(value => key = value);
		}

		this.key = key;
		this.type = key.type;

		ipcRenderer.on('stream:data', (_, { key, rows }: { key: StreamKey, rows: DataType[] }) => {
			if (key === this.key) {
				this.buf.push(...rows);
			}
		});

		ipcRenderer.on('stream:done', (_, { key }: { key: StreamKey }) => {
			if (key === this.key) {
				this.done = true;
			}
		});
	}

	isDone() {
		return this.done;
	}

	async read(): Promise<DataType | null> {
		while (this.buf.length === 0 && !this.done) {
			await window.electron.stream.pull(this.key, 50);
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

	cancel() {
		window.electron.stream.cancel(this.key);
	}
}
