import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '..'
import { type Metadata } from '../../types';

type Options = {
	stuff: void;
};

type UserState = {
	projectDir: string;
	options: Options;
	cases: Metadata[];
	selectedCase?: Metadata;
}

const initialState: UserState = {
	projectDir: '',
	options: {
		stuff: null,
	},
	cases: [],
	selectedCase: null,
};

export const userSlice = createSlice({
	name: 'user',
	initialState,
	reducers: {
		setProjectDir: (state, action: PayloadAction<string>) => {
			state.projectDir = action.payload;
		},
		setCases: (state, action: PayloadAction<Metadata[]>) => {
			state.cases = action.payload;
		}
	}
});

export const { setProjectDir, setCases } = userSlice.actions;

export const selectProjectDir = (state: RootState) => state.user.projectDir;
export const selectCases = (state: RootState) => state.user.cases;
export const selectSelectedCase = (state: RootState) => state.user.selectedCase;
export const selectOptions = (state: RootState) => state.user.options;

export default userSlice.reducer;