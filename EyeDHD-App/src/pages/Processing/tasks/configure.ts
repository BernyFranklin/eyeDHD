import { type Task, type TaskFn } from '.';

const NAME = 'configure';
const WAITING =   'Configure analysis';
const RUNNING =   'Applying configuration...';
const COMPLETED = 'Configuration applied       ';

const fn: TaskFn = async (trial, _dispatch) => {
	// Configuration is saved to the DB via the CaseConfig form before
	// processing starts. This task just confirms it was acknowledged.
	// Re-read the case to ensure the latest config is picked up by
	// downstream tasks.
	await window.electron.case.read(trial.name);
};

export const configure: Task = {
	display: {
		waiting: WAITING,
		running: RUNNING,
		completed: COMPLETED,
	},
	name: NAME as any,
	fn,
};
