import { Dispatch } from '@src/data/hooks';

import { cleanTask } from './clean';
import { detectTask } from './detect';
import { visualizeTask } from './visualize';
import { animateTask } from './animate';
import { stitchTask } from './stitch';

/**
 * Defines the list of tasks that need to be completed to process a case, as well as the
 * order they should be completed in.
 *
 * Each task includes a display name for both waiting and running states, a unique name
 * for tracking progress, and a function that performs the task.
 *
 * The TASKORDER array defines the order in which tasks should be completed, and is used
 * to track progress and update the UI accordingly.
 */

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