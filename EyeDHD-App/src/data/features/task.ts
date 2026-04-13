import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '..'
import { TASKORDER, type Task } from '@src/pages/Processing/tasks';

type TaskError = {
	message: string,
	name?: string,
	stack?: string
}

type TaskState = {
	current?: Task['name'],
	progress: number,
	error?: TaskError | null
}

const initialState: TaskState = {
	current: null,
	progress: 0.0,
	error: null
};

/**
 * Slice for managing the state of the current task being processed, including progress
 * and error handling.
 */
export const taskSlice = createSlice({
	name: 'task',
	initialState,
	reducers: {
		initializeTask: (state) => {
			state.current = null;
			state.progress = 0.0;
			state.error = null;
		},
		setNextTask: (state) => {
			if (state.current === 'complete') {
				return;
			}
			const index = TASKORDER.indexOf(state.current as string) + 1;
			const next = TASKORDER[index];
			if (next) {
				state.current = next;
				state.progress = 0.0;
			}
		},
		setTaskError: (state, action: PayloadAction<TaskError>) => {
			state.error = action.payload;
			state.progress = 0.0;
		},
		setTaskProgress: (state, action: PayloadAction<number>) => {
			state.progress = Math.max(0.0, Math.min(1.0, action.payload));
		}
	}
});

export const { initializeTask, setNextTask, setTaskError, setTaskProgress } = taskSlice.actions;

export const selectCurrentTask = (state: RootState) => state.task.current;
export const selectTaskProgress = (state: RootState) => state.task.progress;
export const selectTaskError = (state: RootState) => state.task.error;

export default taskSlice.reducer;