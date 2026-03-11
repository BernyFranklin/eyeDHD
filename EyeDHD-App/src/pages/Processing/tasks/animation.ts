import * as Three from 'three';

import { setTaskProgress } from '@src/data/features/task';
import { type Task, type TaskFn } from '.';

const NAME = 'animation';
const WAITING = 'Animate eye movements';
const RUNNING = 'Animating eye movements...';
const COMPLETED = 'Animated eye movements';

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

const fn: TaskFn = async (trial, dispatch) => {
	let percent = 0.0;

	// Use three.js non react, render frame by frame, send data to backend for FFMPEG to write to output folder, would be no need for canvas recorder or canvas elements in general
	// <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={100} />
	// <ambientLight intensity={2} color="white" />
	// <Environment preset="studio" /> {/* Lighting environment */}

	const scene = new Three.Scene();
	const camera = new Three.OrthographicCamera(0, 0, 5, 100);

	const renderer = new Three.WebGLRenderer({
		antialias: true,
		powerPreference: 'high-performance'
	});

	renderer.setSize(1920, 1080);


	while (percent < 1.0) {
		await delay(10);

		percent = percent + 0.01;
		dispatch(setTaskProgress(percent));
	}

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