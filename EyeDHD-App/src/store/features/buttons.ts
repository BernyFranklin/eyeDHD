import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '../../store'

interface ButtonsState {
	disabled: boolean
}

const initialState: ButtonsState = {
	disabled: false
};

export const buttonsSlice = createSlice({
	name: 'buttons',
	initialState,
	reducers: {
		enableButtons: (state) => {
			state.disabled = false;
		},
		disableButtons: (state) => {
			state.disabled = true;
		}
	}
});

export const { enableButtons, disableButtons } = buttonsSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectDisabled = (state: RootState) => state.buttons.disabled;

export default buttonsSlice.reducer;