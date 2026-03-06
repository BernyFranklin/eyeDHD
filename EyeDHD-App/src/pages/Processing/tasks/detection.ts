import { setTaskProgress } from '@src/data/features/task';
import { type Task, type TaskFn } from '.';

const NAME = 'detection';
const WAITING = 'Detect saccades';
const RUNNING = 'Detecting saccades...';
const COMPLETED = 'Detected saccades';

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

const fn: TaskFn = async (trial, dispatch) => {
	let percent = 0.0;
	while (percent < 1.0) {
		await delay(10);

		if (percent > 0.5) {
			throw new Error('this is an error');
		}

		percent = percent + 0.01;
		dispatch(setTaskProgress(percent));
	}

	await delay(150);
}

export const detection: Task = {
	display: {
		waiting: WAITING,
		running: RUNNING,
		completed: COMPLETED
	},
	name: NAME,
	fn
}