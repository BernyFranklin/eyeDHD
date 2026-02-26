import { configureStore, combineReducers } from '@reduxjs/toolkit'

import globalReducer from './features/global';
import userReducer from './features/user';

const root = combineReducers({
  global: globalReducer,
  user: userReducer
})

export const store = configureStore({
	reducer: root
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch