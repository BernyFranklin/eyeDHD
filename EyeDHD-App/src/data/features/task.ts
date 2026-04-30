import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '..'
import { TASKORDER, OPTIONAL_TASKS, type OptionalTaskName, type Task } from '@src/pages/Processing/tasks';
import { setSelectedCase } from './user';

type TaskError = {
	message: string,
	name?: string,
	stack?: string
}

type SelectedMap = Record<OptionalTaskName, boolean>;

const allSelected = (): SelectedMap =>
	OPTIONAL_TASKS.reduce((acc, name) => {
		acc[name] = true;
		return acc;
	}, {} as SelectedMap);

type TaskState = {
	current?: Task['name'],
	progress: number,
	error?: TaskError | null,
	selected: SelectedMap
}

const initialState: TaskState = {
	current: null,
	progress: 0.0,
	error: null,
	selected: allSelected()
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
		},
		setTaskSelected: (state, action: PayloadAction<{ name: OptionalTaskName, value: boolean }>) => {
			state.selected[action.payload.name] = action.payload.value;
		},
		setAllTasksSelected: (state, action: PayloadAction<boolean>) => {
			for (const name of OPTIONAL_TASKS) {
				state.selected[name] = action.payload;
			}
		}
	},
	extraReducers: (builder) => {
		// Any case switch (including clearing to null) must reset the pipeline so the
		// new case doesn't inherit a stale `current` from the previous one — which
		// would either mislabel the Start button or auto-resume a task mid-pipeline.
		builder.addCase(setSelectedCase, (state) => {
			state.current = null;
			state.progress = 0.0;
			state.error = null;
			state.selected = allSelected();
		});
	}
});

export const { initializeTask, setNextTask, setTaskError, setTaskProgress, setTaskSelected, setAllTasksSelected } = taskSlice.actions;

export const selectCurrentTask = (state: RootState) => state.task.current;
export const selectTaskProgress = (state: RootState) => state.task.progress;
export const selectTaskError = (state: RootState) => state.task.error;
export const selectTaskSelected = (state: RootState) => state.task.selected;

export default taskSlice.reducer;