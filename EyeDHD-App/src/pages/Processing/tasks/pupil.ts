import { setTaskProgress } from '@src/data/features/task';
import { type Task, type TaskFn } from '.';

const NAME = 'pupil';
const WAITING =   'Analyze pupil dilation and generate visuals';
const RUNNING =   'Analyzing pupil dilation and generating visuals...';
const COMPLETED = 'Analyzed pupil dilation and generated visuals     ';

const fn: TaskFn = async (trial, dispatch) => {
	trial = await window.electron.case.read(trial.name);

	// Pupil pipeline runs as a single backend call with no progress events.
	// Animate an eased fill that asymptotes below 1.0 while the call runs,
	// then snap to 1.0 on resolve so the wheel tracks execution.
	let progress = 0.0;
	const handle = setInterval(() => {
		progress += (0.95 - progress) * 0.04;
		dispatch(setTaskProgress(progress));
	}, 100);

	try {
		await window.electron.case.runPupil(trial);
	} finally {
		clearInterval(handle);
	}

	dispatch(setTaskProgress(1.0));
};

export const pupil: Task = {
	display: {
		waiting: WAITING,
		running: RUNNING,
		completed: COMPLETED
	},
	name: NAME,
	fn,
	cleanup: null
};
