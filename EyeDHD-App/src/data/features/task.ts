import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '..'
import { TASKORDER, type TaskName } from '@src/pages/CaseViewer/tasks';

type TaskState = {
	current: TaskName,
	progress: number,
	error?: Error
}

const initialState: TaskState = {
	current: TASKORDER[0],
	progress: 0.0
};

/**
 * Redux slice for global app state, including things like button disabled states and
 * alerts.
 *
 * Provides actions for setting these values and selectors for accessing them from
 * components.
 */
export const taskSlice = createSlice({
	name: 'task',
	initialState,
	reducers: {
		initializeTask: (state) => {
			state.current = TASKORDER[0];
			state.progress = 0.0;
			state.error = null;
		},
		setNextTask: (state) => {
			const index = TASKORDER.indexOf(state.current) + 1;
			const next = TASKORDER[index];
			if (next) {
				state.current = next;
				state.progress = 0.0;
			}
		},
		setTaskError: (state, action: PayloadAction<Error>) => {
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