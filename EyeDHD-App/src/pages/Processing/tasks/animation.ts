import RemoteStream from '@src/data/RemoteStream';

import { setTaskProgress } from '@src/data/features/task';
import { type Task, type TaskFn } from '.';

const NAME = 'animation';
const WAITING = 'Animate eye movements';
const RUNNING = 'Animating eye movements...';
const COMPLETED = 'Animated eye movements';

const fn: TaskFn = async (trial, dispatch) => {
	trial = await window.electron.case.read(trial.name);

	let progress = 0;

	const stream = await RemoteStream.create('Animating', { trial });
	for await (const _ of stream) {
		const percent = progress / trial.cleaned_rows;
		dispatch(setTaskProgress(percent));


		progress = progress + 1;
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

// Helper functions

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});