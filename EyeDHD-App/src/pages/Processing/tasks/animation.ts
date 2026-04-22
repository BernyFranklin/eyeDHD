import * as Three from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import RemoteStream from '@src/data/RemoteStream';

import { setTaskProgress } from '@src/data/features/task';
import { type Task, type TaskFn } from '.';
import { CaseData, TrackingData } from '@src/data/types';

const NAME = 'animation';
const WAITING = 'Animate eye movements';
const RUNNING = 'Animating eye movements...';
const COMPLETED = 'Animated eye movements';

const SIZE = {
	width: 1280,
	height: 720
};

type Rotation = {
	x: number,
	y: number,
	z: number
};

let activeStream: RemoteStream | null = null;
let cancelled = false;

const fn: TaskFn = async (trial, dispatch) => {
	cancelled = false;
	trial = await window.electron.case.read(trial.name);

	const scene = new Three.Scene();
	scene.background = new Three.Color(0x101010);

	const ambientLight = new Three.AmbientLight(0xffffff, 7);
	scene.add(ambientLight);

	// Load models
	const left = new Three.Scene();
	const right = new Three.Scene();

	const loader = new GLTFLoader();
	const model = await loader.loadAsync(new URL('eye_model.glb', document.baseURI).href);

	left.add(model.scene.clone(true));
	right.add(model.scene.clone(true));
	left.position.set(-2, 0, 0);
	right.position.set(2, 0, 0);

	scene.add(left, right);

	// Get pupils from both scenes
	let left_pupil: Three.Object3D<Three.Object3DEventMap> & Three.Mesh = undefined;
	let right_pupil: Three.Object3D<Three.Object3DEventMap> & Three.Mesh = undefined;
	let left_open_idx = -1;
	let right_open_idx = -1;

	left.traverse((o: Three.Object3D<Three.Object3DEventMap>) => {
		if (o instanceof Three.Mesh && o.morphTargetDictionary && o.morphTargetInfluences) {
			const idx = o.morphTargetDictionary['Open'];
			if (idx !== undefined) {
				left_pupil = o;
				left_open_idx = idx;
			}
		}
	});

	right.traverse((o: Three.Object3D<Three.Object3DEventMap>) => {
		if (o instanceof Three.Mesh && o.morphTargetDictionary && o.morphTargetInfluences) {
			const idx = o.morphTargetDictionary['Open'];
			if (idx !== undefined) {
				right_pupil = o;
				right_open_idx = idx;
			}
		}
	});

	if (left_pupil === undefined || right_pupil === undefined) {
		throw new Error("failed to find pupils in eye model");
	}

	const viewsize = 4;
	const aspect = SIZE.width / SIZE.height;

	// Create camera and position it
	const camera = new Three.OrthographicCamera(
		(-viewsize * aspect) / 2,
		(viewsize * aspect) / 2,
		viewsize / -2,
		viewsize / 2,
		0.1,
		100
	);
	camera.position.set(0, 0, 5);
	camera.lookAt(0, 0, 0);
	camera.updateProjectionMatrix();

	const renderer = new Three.WebGLRenderer({
		antialias: true,
		powerPreference: 'high-performance'
	});
	renderer.setSize(SIZE.width, SIZE.height, false);
	renderer.domElement.remove();

	const renderTarget = new Three.WebGLRenderTarget(SIZE.width, SIZE.height, {
		format: Three.RGBAFormat,
		type: Three.UnsignedByteType,
	});

	renderer.setRenderTarget(renderTarget);

	activeStream = await RemoteStream.create('TrackingData', { trial });

	let progress = 0;
	let keep = 0;
	let kept = 0;
	const left_rotation = { x: 0.0, y: 0.0, z: 0.0 };
	const right_rotation = { x: 0.0, y: 0.0, z: 0.0 };

	let frames = [];
	const pixels = new Uint8Array(SIZE.width * SIZE.height * 4);

	// Phase timers (ms). Reveal which stage dominates on Windows vs Mac.
	let renderMs = 0;
	let readbackMs = 0;
	let ipcMs = 0;
	let iterWaitMs = 0;
	let dispatchMs = 0;
	let sliceMs = 0;
	let rowsProcessed = 0;
	let lastLoggedAt = 0;
	const wallStart = performance.now();
	let tPrevIterEnd = wallStart;

	window.electron.case.startFFMPEG(trial, SIZE);

	outer: while (true) {
		const batch = await activeStream.readBatch();
		if (batch.length === 0) {
			break;
		}

		for (const row of batch) {
			if (cancelled) {
				break outer;
			}

			const tIterStart = performance.now();
			iterWaitMs += tIterStart - tPrevIterEnd;
			rowsProcessed++;

			const tDispatchStart = performance.now();
			const percent = progress / trial.cleaned_rows;
			dispatch(setTaskProgress(percent));
			dispatchMs += performance.now() - tDispatchStart;

			if (progress !== keep) {
				progress = progress + 1;
				tPrevIterEnd = performance.now();
				continue;
			}

			kept = kept + 1;

			const targets = calculate_rotations(row as TrackingData);
			update_dilation(row as TrackingData, left_pupil, right_pupil, left_open_idx, right_open_idx);
			interpolate_rotation(targets, left_rotation, right_rotation);

			// Apply rotation to models
			left.rotation.set(left_rotation.x, left_rotation.y, left_rotation.z);
			right.rotation.set(right_rotation.x, right_rotation.y, right_rotation.z);

			// Render scene and grab pixels to send to backend
			const tRenderStart = performance.now();
			renderer.render(scene, camera);
			const tReadStart = performance.now();

			renderer.readRenderTargetPixels(
				renderer.getRenderTarget(),
				0,
				0,
				SIZE.width,
				SIZE.height,
				pixels
			);
			const tReadEnd = performance.now();
			const tSliceStart = tReadEnd;
			frames.push(pixels.slice());
			const tSliceEnd = performance.now();

			renderMs += tReadStart - tRenderStart;
			readbackMs += tReadEnd - tReadStart;
			sliceMs += tSliceEnd - tSliceStart;

			if (frames.length >= 100) {
				if (cancelled) {
					break outer;
				}
				const tIpcStart = performance.now();
				await window.electron.case.saveAnimation(trial, frames, SIZE);
				ipcMs += performance.now() - tIpcStart;
				frames = [];
			}

			if (kept - lastLoggedAt >= 500) {
				const wall = performance.now() - wallStart;
				console.log(
					`[animation] frames=${kept} rows=${rowsProcessed} wall=${wall.toFixed(0)}ms ` +
					`render=${renderMs.toFixed(0)}ms ` +
					`readback=${readbackMs.toFixed(0)}ms ` +
					`ipc=${ipcMs.toFixed(0)}ms ` +
					`iterWait=${iterWaitMs.toFixed(0)}ms ` +
					`dispatch=${dispatchMs.toFixed(0)}ms ` +
					`slice=${sliceMs.toFixed(0)}ms`
				);
				lastLoggedAt = kept;
			}

			progress = progress + 1;
			keep = keep + calculate_interval(progress);
			tPrevIterEnd = performance.now();
		}
	}

	activeStream = null;

	// If the task was cancelled (user navigated away), cleanup() is responsible for
	// tearing down ffmpeg. Sending more frames or a completion signal here would race
	// with cleanup's stdin.end() and cause ERR_STREAM_WRITE_AFTER_END.
	if (cancelled) {
		renderer.dispose();
		renderTarget.dispose();
		return;
	}

	window.electron.case.saveAnimation(trial, frames, SIZE);

	const wallTotal = performance.now() - wallStart;
	console.log(
		`[animation] DONE frames=${kept} rows=${rowsProcessed} wall=${wallTotal.toFixed(0)}ms ` +
		`render=${renderMs.toFixed(0)}ms ` +
		`readback=${readbackMs.toFixed(0)}ms ` +
		`iterWait=${iterWaitMs.toFixed(0)}ms ` +
		`dispatch=${dispatchMs.toFixed(0)}ms ` +
		`slice=${sliceMs.toFixed(0)}ms ` +
		`ipc=${ipcMs.toFixed(0)}ms`
	);

	await window.electron.case.stopFFMPEG(trial, true);

	renderer.dispose();
	renderTarget.dispose();

	await delay(150);
}

async function cleanup(trial: CaseData) {
	cancelled = true;
	activeStream?.cancel();
	activeStream = null;
	await window.electron.case.stopFFMPEG(trial, false);
}

export const animation: Task = {
	display: {
		waiting: WAITING,
		running: RUNNING,
		completed: COMPLETED
	},
	name: NAME,
	fn,
	cleanup
}

// Helper functions

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

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
function update_dilation(
	row: TrackingData,
	left_pupil: Three.Mesh,
	right_pupil: Three.Mesh,
	left_open_idx: number,
	right_open_idx: number
) {
	if (row.LeftEyeStatus !== 'Invalid') {
		left_pupil.morphTargetInfluences[left_open_idx] = NormalizePupilDilation(row.LeftPupilDiameterInMM);
	}

	if (row.RightEyeStatus !== 'Invalid') {
		right_pupil.morphTargetInfluences[right_open_idx] = NormalizePupilDilation(row.RightPupilDiameterInMM);
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