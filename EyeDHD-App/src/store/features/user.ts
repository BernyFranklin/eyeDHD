import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '..'
import { type CaseData } from '../../types';

type Options = {
	stuff: void;
};

type UserState = {
	projectDir?: string;
	projectInitialized?: boolean;
	options: Options;
	cases?: CaseData[];
	selectedCase?: CaseData;
}

const initialState: UserState = {
	projectDir: null,
	projectInitialized: false,
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
		setProjectInitialized: (state, action: PayloadAction<boolean>) => {
			state.projectInitialized = action.payload;
		},
		setCases: (state, action: PayloadAction<CaseData[]>) => {
			state.cases = action.payload;
		}
	}
});

export const { setProjectDir, setProjectInitialized, setCases } = userSlice.actions;

export const selectProjectDir = (state: RootState) => state.user.projectDir;
export const selectProjectInitialized = (state: RootState) => state.user.projectInitialized;
export const selectCases = (state: RootState) => state.user.cases;
export const selectSelectedCase = (state: RootState) => state.user.selectedCase;
export const selectOptions = (state: RootState) => state.user.options;

export default userSlice.reducer;