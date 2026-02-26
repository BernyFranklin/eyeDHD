import { configureStore, combineReducers } from '@reduxjs/toolkit'

import buttonsReducer from './features/buttons';

const root = combineReducers({
  buttons: buttonsReducer,
})

export const store = configureStore({
	reducer: root
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch