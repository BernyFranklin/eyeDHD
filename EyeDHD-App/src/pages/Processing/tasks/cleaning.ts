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

let activeStream: RemoteStream | null = null;

const fn: TaskFn = async (trial, dispatch) => {
	trial = await window.electron.case.read(trial.name);

	let percent = 0.0;

	activeStream = await RemoteStream.create('Cleaning', { trial });
	for await (const _ of activeStream) {
		percent = Math.min((activeStream.progress.bytesRead / activeStream.progress.totalBytes), 1.0);
		dispatch(setTaskProgress(percent));
	}
	activeStream = null;

	await delay(150);
}

async function cleanup(_trial: CaseData) {
	activeStream?.cancel();
	activeStream = null;
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