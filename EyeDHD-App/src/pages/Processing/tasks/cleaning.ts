import { setTaskProgress } from '@src/data/features/task';
import { type Task, type TaskFn } from '.';
import RemoteStream from '@src/data/RemoteStream';
import { CaseData } from '@src/data/types';

const NAME = 'cleaning';
const WAITING = 'Clean data';
const RUNNING = 'Cleaning data...';
const COMPLETED = 'Cleaned data';

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

const fn: TaskFn = async (trial, dispatch) => {
	trial = await window.electron.case.read(trial.name);

	let percent = 0.0;

	const stream = await RemoteStream.create('Cleaning', { trial });
	for await (const _ of stream) {
		percent = Math.min((stream.progress.bytesRead / stream.progress.totalBytes), 1.0);
		dispatch(setTaskProgress(percent));
	}

	await delay(150);
}

async function cleanup(trial: CaseData) {
	// Signal backend to cancel cleaning process
}

export const cleaning: Task = {
	display: {
		waiting: WAITING,
		running: RUNNING,
		completed: COMPLETED
	},
	name: NAME,
	fn,
	cleanup
}