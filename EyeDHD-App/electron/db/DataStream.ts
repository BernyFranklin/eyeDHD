import fs from "fs";
import rl from "readline";

import os from 'os';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

import gl from "gl";
import * as Three from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { TRACKING_DATA_HEADERS, type TrackingData, fromCSV, toCSV } from "./tables/TrackingData";
import caseDataActions, { type CaseData, csvImportPath, csvOutputPath } from "./tables/CaseData";
import DatabaseManager from "./DatabaseManager";
import DataCleaner from "@electron/analysis/DataCleaner";

export type DataType = CaseData | TrackingData;
export type StreamType = 'CaseData' | 'TrackingData' | 'Cleaning' | 'Animating';
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

const SIZE = {
	width: 1920,
	height: 1080
};

type Rotation = {
	x: number,
	y: number,
	z: number
};

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

			case 'Animating': {
				if (!self.trial) {
					throw new Error('File must be provided for Animating streams');
				}

				yield* DataStream.animatingIterator(self, manager);
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

	private static async *animatingIterator(
		self: DataStream,
		manager: DatabaseManager
	): AsyncGenerator<DataType[], void, undefined> {
		// ffmpeg init here
		const ffmpeg = spawn("ffmpeg", [
			"-y",
			"-f", "rawvideo",
			"-pix_fmt", "rgba",
			"-s", `${SIZE.width}x${SIZE.height}`,
			"-r", `${30}`,
			"-i", "pipe:0",
			"-vf", "vflip",
			"-c:v", "libx264",
			"-pix_fmt", "yuv420p",
			"test.mp4"
		], { stdio: ["pipe", "inherit", "inherit"] });

		const context = gl(SIZE.width, SIZE.height, { preserveDrawingBuffer: true });
		const canvas = new HTMLCanvasElement();
		canvas.width = SIZE.width;
		canvas.height = SIZE.height;

		const scene = new Three.Scene();
		scene.background = new Three.Color(0x101010);

		const ambientLight = new Three.AmbientLight(0xffffff, 2);
		scene.add(ambientLight);

		// Load models
		const left = new Three.Scene();
		const right = new Three.Scene();

		const loader = new GLTFLoader();
		const model = await loader.loadAsync('/eye_model.glb');

		left.add(model.scene.clone(true));
		right.add(model.scene.clone(true));
		left.position.set(-2, 0, 0);
		right.position.set(2, 0, 0);

		scene.add(left, right);

		// Get pupils from both scenes
		let left_pupil: Three.Object3D<Three.Object3DEventMap> & Three.Mesh = undefined;
		let right_pupil: Three.Object3D<Three.Object3DEventMap> & Three.Mesh = undefined;

		left.traverse((o: Three.Object3D<Three.Object3DEventMap>) => {
			if (o instanceof Three.Mesh && o.morphTargetDictionary && o.morphTargetInfluences) {
				if (o.morphTargetDictionary['Open'] !== undefined) {
					left_pupil = o;
				}
			}
		});

		right.traverse((o: Three.Object3D<Three.Object3DEventMap>) => {
			if (o instanceof Three.Mesh && o.morphTargetDictionary && o.morphTargetInfluences) {
				if (o.morphTargetDictionary['Open'] !== undefined) {
					right_pupil = o;
				}
			}
		});

		if (left_pupil === undefined || right_pupil === undefined) {
			throw new Error("failed to find pupils in eye model");
		}

		// Create camera and position it
		const camera = new Three.OrthographicCamera(
			(-4 * SIZE.width / SIZE.height) / 2,
			(4 * SIZE.width / SIZE.height) / 2,
			-2,
			2,
			0.1,
			100
		);
		camera.position.set(0, 0, 5);
		camera.lookAt(0, 0, 0);
		camera.updateProjectionMatrix();

		const renderer = new Three.WebGLRenderer({
			context,
			canvas,
			antialias: true,
			powerPreference: 'high-performance'
		});
		renderer.setSize(SIZE.width, SIZE.height, false);

		const stream = new DataStream('TrackingData', self.trial).start(manager);
		const rows = await stream.collect();

		let progress = 0;
		let keep = 0;
		let kept = 0;
		const left_rotation = { x: 0.0, y: 0.0, z: 0.0 };
		const right_rotation = { x: 0.0, y: 0.0, z: 0.0 };

		let batch: DataType[] = [];
		const pixels = new Uint8Array(SIZE.width * SIZE.height * 4);
		for (const row of rows) {
			batch.push(row);

			if (batch.length >= BATCH_SIZE) {
				yield batch;
				batch = [];
			}

			if (progress !== keep) {
				progress = progress + 1;
				continue;
			}

			kept = kept + 1;

			const targets = calculate_rotations(row as TrackingData);
			// TODO: This isn't working
			update_dilation(row as TrackingData, left_pupil, right_pupil);
			interpolate_rotation(targets, left_rotation, right_rotation);

			// Apply rotation to models
			left.rotation.set(left_rotation.x, left_rotation.y, left_rotation.z);
			right.rotation.set(right_rotation.x, right_rotation.y, right_rotation.z);

			// Render scene and grab pixels to send to backend
			renderer.render(scene, camera);

			context.readPixels(
				0,
				0,
				SIZE.width,
				SIZE.height,
				context.RGBA,
				context.UNSIGNED_BYTE,
				pixels
			);

			// Write to ffmpeg
			ffmpeg.stdin.write(pixels)

			progress = progress + 1;
			keep = keep + calculate_interval(progress);
		}

		ffmpeg.stdin.end();
		ffmpeg.on('close', (code) => {
			stream.close();
			renderer.dispose();
			context.getExtension('STACKGL_destroy_context').destroy();
		});

		if (batch.length > 0) {
			yield batch;
		}
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

const calculate_interval = (i: number) => {
	const rem = i % 20;

	if (rem < 7) {
		return 7;
	} else if (rem < 13) {
		return 6;
	} else {
		return 7;
	}
}


// Calculate target rotations from forward vector and eye status
function calculate_rotations(row: TrackingData): { left?: Rotation, right?: Rotation } {
	const left_forward_x = row.LeftEyeForwardX;
	const left_forward_y = row.LeftEyeForwardY;
	const left_forward_z = row.LeftEyeForwardZ;
	const left_pitch = GetPitch(left_forward_x, left_forward_y, left_forward_z);
	const left_yaw = GetYaw(left_forward_x, left_forward_y, left_forward_z);

	const right_forward_x = row.RightEyeForwardX;
	const right_forward_y = row.RightEyeForwardY;
	const right_forward_z = row.RightEyeForwardZ;
	const right_pitch = GetPitch(right_forward_x, right_forward_y, right_forward_z);
	const right_yaw = GetYaw(right_forward_x, right_forward_y, right_forward_z);

	const left_target = row.LeftEyeStatus === 'Invalid'
		? null
		: { x: left_pitch, y: left_yaw, z: 0 };

	const right_target = row.RightEyeStatus === 'Invalid'
		? null
		: { x: right_pitch, y: right_yaw, z: 0 };

	return {
		left: left_target,
		right: right_target
	}
}

// Interpolate rotation towards target rotation if target is valid, otherwise keep current rotation
function interpolate_rotation(
	targets: { left?: Rotation, right?: Rotation },
	left_rotation: Rotation,
	right_rotation: Rotation
) {
	const smoothing = 1;

	if (targets.left) {
		left_rotation.x += (targets.left.x - left_rotation.x) * smoothing;
		left_rotation.y += (targets.left.y - left_rotation.y) * smoothing;
		left_rotation.z += (targets.left.z - left_rotation.z) * smoothing;
	}

	if (targets.right) {
		right_rotation.x += (targets.right.x - right_rotation.x) * smoothing;
		right_rotation.y += (targets.right.y - right_rotation.y) * smoothing;
		right_rotation.z += (targets.right.z - right_rotation.z) * smoothing;
	}
}

// Update pupil dilation based on pupil diameter in mm, normalized to 0-1 range
function update_dilation(row: TrackingData, left_pupil: Three.Mesh, right_pupil: Three.Mesh) {
	const left_dilation = NormalizePupilDilation(row.LeftPupilDiameterInMM);
	if (row.RightEyeStatus !== 'Invalid') {
		left_pupil.morphTargetInfluences[0] = left_dilation;
	}

	const right_dilation = NormalizePupilDilation(row.RightPupilDiameterInMM);
	if (row.RightEyeStatus !== 'Invalid') {
		right_pupil.morphTargetInfluences[0] = right_dilation;
	}
}

// Calculate pitch angle from forward vector
function GetPitch(x: number, y: number, z: number) {
	return Math.atan2(-y, Math.sqrt(x * x + z * z));
}

// Calculate yaw angle from forward vector
function GetYaw(x: number, _: number, z: number) {
	return Math.atan2(x, z);
}

// Normalizes pupil dilation from mm to 0-1 range
function NormalizePupilDilation(dilationInMM: number, minMM = 1, maxMM = 8) {
    const clampedDilation = Math.min(Math.max(dilationInMM, minMM), maxMM);

    // Normalize to 0-1 range
    return (clampedDilation - minMM) / (maxMM - minMM);
}