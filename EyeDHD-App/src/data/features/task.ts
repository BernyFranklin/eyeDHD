import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '..'
import { TASKORDER, type TaskName } from '@src/pages/CaseViewer/tasks';

type TaskState = {
	current: TaskName,
	progress: number
}

const initialState: TaskState = {
	current: 'none',
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
		setNextTask: (state) => {
			const index = TASKORDER.indexOf(state.current) + 1;
			const next = TASKORDER[index];
			if (next) {
				state.current = next;
				state.progress = 0.0;
			}
		},
		setTaskProgress: (state, action: PayloadAction<number>) => {
			state.progress = Math.max(0.0, Math.min(1.0, action.payload));
		}
	}
});

export const { setNextTask, setTaskProgress } = taskSlice.actions;

export const selectCurrentTask = (state: RootState) => state.task.current;
export const selectTaskProgress = (state: RootState) => state.task.progress;

export default taskSlice.reducer;