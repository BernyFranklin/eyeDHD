import { setTaskProgress } from '@src/data/features/task';
import { type Task, type TaskFn } from '.';

const NAME = 'animation';
const WAITING = 'Animate eye movements';
const RUNNING = 'Animating eye movements...';
const COMPLETED = 'Animated eye movements';

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

// We need to somehow create a Canvas recorder and control it from here.
// Maybe we can have one hiden in the task list / processing page
// and pass it's ref to here.
// We also need access to the stream so we can update progress here
// for consistence, although that could be done in the animation components instead
const fn: TaskFn = async (trial, dispatch) => {
	let percent = 0.0;
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