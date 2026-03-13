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
	width: 1920,
	height: 1080
};

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

const fn: TaskFn = async (trial, dispatch) => {
	// <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
	// <ambientLight intensity={2} color="white" />
	// <Environment preset="studio" /> {/* Lighting environment */}

	const scene = new Three.Scene();
	const left = new Three.Scene();
	const right = new Three.Scene();
	scene.add(left, right);

	const loader = new GLTFLoader();
	const model = await loader.loadAsync('/eye_model.glb');

	left.add(model.scene.clone(true));
	right.add(model.scene.clone(true));
	left.position.set(-2, 0, 0);
	right.position.set(2, 0, 0);

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

	const left_current_rotation = { x: 0.0, y: 0.0, z: 0.0 };
	const right_current_rotation = { x: 0.0, y: 0.0, z: 0.0 };

	const camera = new Three.OrthographicCamera(0, 0, 5, 100);
	const renderer = new Three.WebGLRenderer({
		antialias: true,
		powerPreference: 'high-performance'
	});

	renderer.setSize(SIZE.width, SIZE.height);

	//const canvas = renderer.domElement;
	//canvas.style.display = 'none';

	document.body.appendChild(renderer.domElement);

	let i = 0;

	const stream = await RemoteStream.create('TrackingData', { trial });
	for await (const row of stream) {
		const data = row as TrackingData;

		// Calculate progress
		const percent = i / trial.cleaned_rows;
		dispatch(setTaskProgress(percent));

		// Calculate new rotations
		const targets = calculate_rotations(data);

		// Update dilations
		const left_dilation = NormalizePupilDilation(data['LeftPupilDiameterInMM']);
		// const idx = left_pupil.morphTargetDictionary['Open'];
		if (data['LeftEyeStatus'] !== 'Invalid') {
			left_pupil.morphTargetInfluences[0] = left_dilation;
		}

		const right_dilation = NormalizePupilDilation(data['RightPupilDiameterInMM']);
		if (data['RightEyeStatus'] !== 'Invalid') {
			right_pupil.morphTargetInfluences[0] = right_dilation;
		}

		// Interpolate new rotations from current if new targets
		const smoothing = 1;

		if (targets.left) {
			left_current_rotation.x += (targets.left.x - left_current_rotation.x) * smoothing;
			left_current_rotation.y += (targets.left.y - left_current_rotation.y) * smoothing;
			left_current_rotation.z += (targets.left.z - left_current_rotation.z) * smoothing;
		}

		if (targets.right) {
			right_current_rotation.x += (targets.right.x - right_current_rotation.x) * smoothing;
			right_current_rotation.y += (targets.right.y - right_current_rotation.y) * smoothing;
			right_current_rotation.z += (targets.right.z - right_current_rotation.z) * smoothing;
		}

		// Apply rotations
		left.rotation.set(
			left_current_rotation.x,
			left_current_rotation.y,
			left_current_rotation.z
		);
		right.rotation.set(
			right_current_rotation.x,
			right_current_rotation.y,
			right_current_rotation.z
		);

		// Render scene and grab pixels to send to backend
		renderer.render(scene, camera);

		const pixels = new Uint8Array(SIZE.width * SIZE.height * 4);
		renderer.readRenderTargetPixels(
			renderer.getRenderTarget(),
			0,
			0,
			SIZE.width,
			SIZE.height,
			pixels
		);

		console.log(`Frame ${i}:`, pixels.slice(0, 10));

		// Send pixels to backend

		i = i + 1;
	}

	//renderer.setAnimationLoop(animate);

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

function calculate_rotations(row: TrackingData): {
	left: { x: number, y: number, z: number } | null,
	right: { x: number, y: number, z: number } | null
} {
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

// Calculate pitch angle from forward vector
function GetPitch(x: number, y: number, z: number) {
	return Math.atan2(-y, Math.sqrt(x * x + z * z));
}

// Calculate yaw angle from forward vector
function GetYaw(x: number, y: number, z: number) {
	return Math.atan2(x, z);
}

// Normalizes pupil dilation from mm to 0-1 range
function NormalizePupilDilation(dilationInMM: number, minMM = 1, maxMM = 8) {
    if (
     	Number.isNaN(dilationInMM)
      	|| !Number.isFinite(dilationInMM)
    ) {
        return 0; // Return 0 for invalid input
    }

    // Clamp dilation to min and max
    const clampedDilation = Math.min(Math.max(dilationInMM, minMM), maxMM);

    // Normalize to 0-1 range
    return (clampedDilation - minMM) / (maxMM - minMM);
}