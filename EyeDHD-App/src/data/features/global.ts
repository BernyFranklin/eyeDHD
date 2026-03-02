import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '..'

export type AlertColor = 'red' | 'green';

type AlertState = {
	isVisible: boolean
	color: AlertColor
	message: string
	key: number
}

type GlobalState = {
	buttons: {
		disabled: boolean
	},
	alert: AlertState
}

const initialState: GlobalState = {
	buttons: {
		disabled: false
	},
	alert: {
		isVisible: false,
		color: 'green',
		message: '',
		key: 0
	}
};

/**
 * Redux slice for global app state, including things like button disabled states and
 * alerts.
 *
 * Provides actions for setting these values and selectors for accessing them from
 * components.
 */
export const globalSlice = createSlice({
	name: 'global',
	initialState,
	reducers: {
		enableButtons: (state) => {
			state.buttons.disabled = false;
		},
		disableButtons: (state) => {
			state.buttons.disabled = true;
		},
		showAlert: (state, action: PayloadAction<{ color?: AlertColor; message: string }>) => {
			state.alert.isVisible = true;
			state.alert.color = action.payload.color ?? 'green';
			state.alert.message = action.payload.message;
			state.alert.key += 1;
		},
		hideAlert: (state) => {
			state.alert.isVisible = false;
			state.alert.message = '';
		}
	}
});

export const { enableButtons, disableButtons, showAlert, hideAlert } = globalSlice.actions;

export const selectButtons = (state: RootState) => state.global.buttons;
export const selectAlert = (state: RootState) => state.global.alert;

export default globalSlice.reducer;