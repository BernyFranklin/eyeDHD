import { Dispatch } from '@src/data/hooks';

import { cleanTask } from './clean';
import { detectTask } from './detect';
import { visualizeTask } from './visualize';
import { animateTask } from './animate';
import { stitchTask } from './stitch';

export const TASKS = [
	cleanTask,
	detectTask,
	visualizeTask,
	animateTask,
	stitchTask
];

export const TASKORDER = [
	'none',
	'clean',
	'detect',
	'visualize',
	'animate',
	'stitch',
	'complete'
] as const;

export type TaskName = typeof TASKORDER[number];

export type Task = {
	display: {
		waiting: string,
		running: string
	},
	name: TaskName,
	fn: TaskFn
}

export type TaskFn = (dispatch: Dispatch) => Promise<void>;