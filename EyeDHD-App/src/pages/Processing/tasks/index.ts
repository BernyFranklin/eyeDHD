import { type CaseData } from '@src/data/types';
import { Dispatch } from '@src/data/hooks';

import { cleaning } from './cleaning';
import { detection } from './detection';
import { visualization } from './visualization';
import { animation } from './animation';
import { combination } from './combination';

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

// Generate TaskName type from the keys of the tasks object in CaseData, so changes to
// tasks in CaseData will automatically update the TaskName type and prevent mismatches.
export type TaskName = CaseData['tasks'] extends Record<infer K, boolean> ? K : never;

export type TaskFn = (trial: CaseData, dispatch: Dispatch) => Promise<void>;

export type Task = {
	display: {
		waiting: string,
		running: string,
		completed: string
	},
	name: TaskName | 'complete',
	fn: TaskFn
}

export const TASKS = [
	cleaning,
	detection,
	visualization,
	animation,
	combination
] as const;

export const TASKORDER = TASKS.map(task => task.name).concat(['complete']);