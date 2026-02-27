import { createSlice } from '@reduxjs/toolkit'

import type { RootState } from '..'

type GlobalState = {
	buttons: {
		disabled: boolean
	}
}

const initialState: GlobalState = {
	buttons: {
		disabled: false
	}
};

export const globalSlice = createSlice({
	name: 'global',
	initialState,
	reducers: {
		enableButtons: (state) => {
			state.buttons.disabled = false;
		},
		disableButtons: (state) => {
			state.buttons.disabled = true;
		}
	}
});

export const { enableButtons, disableButtons } = globalSlice.actions;

export const selectButtons = (state: RootState) => state.global.buttons;

export default globalSlice.reducer;