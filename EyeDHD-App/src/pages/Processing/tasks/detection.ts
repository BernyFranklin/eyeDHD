import { setTaskProgress } from '@src/data/features/task';
import { type Task, type TaskFn } from '.';

const NAME = 'detection';
const WAITING = 'Detect saccades';
const RUNNING = 'Detecting saccades...';
const COMPLETED = 'Detected saccades';

const fn: TaskFn = async (trial, dispatch) => {
	trial = await window.electron.case.read(trial.name);

	// The detection pipeline runs as a single backend call. We don't have
	// granular progress yet, so we mark a midpoint then complete on resolve.
	dispatch(setTaskProgress(0.1));

	await window.electron.case.runDetection(trial);

	dispatch(setTaskProgress(1.0));
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
