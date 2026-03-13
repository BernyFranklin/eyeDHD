import * as Three from 'three';
import { useGLTF } from '@react-three/drei';

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

	//const scene = new Three.Scene();
	const { scene: left } = useGLTF('/eye_model.glb');
	const { scene: right } = useGLTF('/eye_model.glb');
	left.position.set(-2, 0, 0);
	right.position.set(2, 0, 0);

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
		const percent = i / trial.cleaned_rows;
		dispatch(setTaskProgress(percent));

		// Create objects and draw
		const left_targets: Three.Object3D<Three.Object3DEventMap>[] = [];
		const right_targets: Three.Object3D<Three.Object3DEventMap>[] = [];

		left.traverse((o: Three.Object3D<Three.Object3DEventMap>) => {
			left_targets.push(o);
		});

		right.traverse((o: Three.Object3D<Three.Object3DEventMap>) => {
			right_targets.push(o);
		});

		const scene = new Three.Scene();
		scene.copy(left);
		scene.copy(right);

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

// Calculate pitch angle from forward vector
export function GetPitch(x: number, y: number, z: number) {
	return Math.atan2(-y, Math.sqrt(x * x + z * z));
}

// Calculate yaw angle from forward vector
export function GetYaw(x: number, y: number, z: number) { return Math.atan2(x, z); }

// Normalizes pupil dilation from mm to 0-1 range
export function NormalizePupilDilation(dilationInMM: number, minMM = 1, maxMM = 8) {
    if (
    	typeof dilationInMM !== 'number'
     	|| Number.isNaN(dilationInMM)
      	|| !Number.isFinite(dilationInMM)
    ) {
        return 0; // Return 0 for invalid input
    }

    // Clamp dilation to min and max
    const clampedDilation = Math.min(Math.max(dilationInMM, minMM), maxMM);

    // Normalize to 0-1 range
    return (clampedDilation - minMM) / (maxMM - minMM);
}

// Check data validity for angle and required fields
export function CheckDataValidity(angle: number, row: TrackingData) {
    let isValid = true;

    // Validate angle
    if((typeof angle !== 'number' && Number.isNaN(angle) && !Number.isFinite(angle))){
        isValid = false;
    }

    // Sanity check for required fields
    const positions = ['Left', 'Right'];
    const axis = ['X', 'Y', 'Z'];

    // Check all required fields
    for(const pos of positions) {
        for(const ax of axis) {
            const key = `${pos}EyeForward${ax}`;

            // Check if the field is missing or empty
            if((row as any)[key] === undefined || (row as any)[key] === null) {
                isValid = false;
                break;
            }
        }
    }

    return isValid;
}