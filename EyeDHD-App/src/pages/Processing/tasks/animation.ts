import * as Three from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { type TrackingData } from "@src/data/types";
import RemoteStream from '@src/data/RemoteStream';

import { setTaskProgress } from '@src/data/features/task';
import { type Task, type TaskFn } from '.';

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

const fn: TaskFn = async (trial, dispatch) => {
	/*
	 * Rendering setup
	 */

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

	const left_rotation = { x: 0.0, y: 0.0, z: 0.0 };
	const right_rotation = { x: 0.0, y: 0.0, z: 0.0 };

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
		antialias: true,
		powerPreference: 'high-performance'
	});

	renderer.setSize(SIZE.width, SIZE.height);

	// Render to this instead of a canvas element
	// const renderTarget = new Three.WebGLRenderTarget(SIZE.width, SIZE.height, {
	// 	format: Three.RGBAFormat,
	// 	type: Three.UnsignedByteType,
	// 	depthBuffer: true,
	// 	stencilBuffer: false
	// });

	// renderer.setRenderTarget(renderTarget);
	document.body.appendChild(renderer.domElement);

	let i = 0;
	const stream = await RemoteStream.create('TrackingData', { trial });

	/*
	 * Rendering loop
	 */

	for await (const row of stream) {
		// Calculate progress
		const percent = i / trial.cleaned_rows;
		dispatch(setTaskProgress(percent));

		const targets = calculate_rotations(row as TrackingData);
		update_dilation(row as TrackingData, left_pupil, right_pupil);
		interpolate_rotation(targets, left_rotation, right_rotation);

		// Apply rotation to models
		left.rotation.set(
			left_rotation.x,
			left_rotation.y,
			left_rotation.z
		);
		right.rotation.set(
			right_rotation.x,
			right_rotation.y,
			right_rotation.z
		);

		// Render scene and grab pixels to send to backend
		renderer.render(scene, camera);

		// const pixels = new Uint8Array(SIZE.width * SIZE.height * 4);
		// renderer.readRenderTargetPixels(
		// 	renderer.getRenderTarget(),
		// 	0,
		// 	0,
		// 	SIZE.width,
		// 	SIZE.height,
		// 	pixels
		// );

		// console.log(`Frame ${i}:`, pixels.slice(0, 10));

		// Send pixels to backend

		i = i + 1;
	}

	// renderTarget.dispose();
	renderer.dispose();
	renderer.domElement.remove();

	await delay(150);
}

export const animation: Task = {
	display: {
		waiting: WAITING,
		running: RUNNING,
		completed: COMPLETED
	},
	name: NAME,
	fn
}

// Helper functions

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

// Calculate target rotations from forward vector and eye status
function calculate_rotations(row: TrackingData): { left?: Rotation, right?: Rotation } {
	const left_forward_x = row['LeftEyeForwardX'];
	const left_forward_y = row['LeftEyeForwardY'];
	const left_forward_z = row['LeftEyeForwardZ'];
	const left_pitch = GetPitch(left_forward_x, left_forward_y, left_forward_z);
	const left_yaw = GetYaw(left_forward_x, left_forward_y, left_forward_z);

	const right_forward_x = row['RightEyeForwardX'];
	const right_forward_y = row['RightEyeForwardY'];
	const right_forward_z = row['RightEyeForwardZ'];
	const right_pitch = GetPitch(right_forward_x, right_forward_y, right_forward_z);
	const right_yaw = GetYaw(right_forward_x, right_forward_y, right_forward_z);

	const left_target = row['LeftEyeStatus'] === 'Invalid'
		? null
		: { x: left_pitch, y: left_yaw, z: 0 };

	const right_target = row['RightEyeStatus'] === 'Invalid'
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
	const left_dilation = NormalizePupilDilation(row['LeftPupilDiameterInMM']);
	if (row['LeftEyeStatus'] !== 'Invalid') {
		const idx = left_pupil.morphTargetDictionary['Open'];
		left_pupil.morphTargetInfluences[idx] = left_dilation;
	}

	const right_dilation = NormalizePupilDilation(row['RightPupilDiameterInMM']);
	if (row['RightEyeStatus'] !== 'Invalid') {
		const idx = right_pupil.morphTargetDictionary['Open'];
		right_pupil.morphTargetInfluences[idx] = right_dilation;
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