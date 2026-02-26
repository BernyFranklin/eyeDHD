import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import type { RootState } from '../../store'

interface ButtonsState {
	enabled: boolean
}

const initialState: ButtonsState = {
	enabled: true
};

export const buttonsSlice = createSlice({
	name: 'buttons',
	initialState,
	reducers: {
		enable: (state) => {
			state.enabled = true;
		},
		disable: (state) => {
			state.enabled = false;
		}
	}
});

export const { enable, disable } = buttonsSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectEnabled = (state: RootState) => state.enabled;

export default buttonsSlice.reducer;