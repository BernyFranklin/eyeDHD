import { setTaskProgress } from '@src/data/features/task';
import { Task, TaskFn } from '.';

const NAME = 'detect';
const WAITING = 'Detect saccades';
const RUNNING = 'Detecting saccades...';

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

const fn: TaskFn = async (dispatch) => {
	let percent = 0.0;
	while (percent < 1.0) {
		await delay(10);

		percent = percent + 0.01;
		dispatch(setTaskProgress(percent));
	}

	await delay(150);
}

export const detectTask: Task = {
	display: { waiting: WAITING, running: RUNNING },
	name: NAME,
	fn
}