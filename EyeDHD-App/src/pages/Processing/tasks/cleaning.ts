import { setTaskProgress } from '@src/data/features/task';
import { type Task, type TaskFn } from '.';
import RemoteStream from '@src/data/RemoteStream';

const NAME = 'cleaning';
const WAITING = 'Clean data';
const RUNNING = 'Cleaning data...';
const COMPLETED = 'Cleaned data';

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

const fn: TaskFn = async (trial, dispatch) => {
	let percent = 0.0;

	const stream = await RemoteStream.create('Cleaning', { trial });
	for await (const _ of stream) {
		percent = Math.min((stream.progress.bytesRead / stream.progress.totalBytes), 1.0);
		dispatch(setTaskProgress(percent));
	}

	await delay(150);
}

export const cleaning: Task = {
	display: {
		waiting: WAITING,
		running: RUNNING,
		completed: COMPLETED
	},
	name: NAME,
	fn
}