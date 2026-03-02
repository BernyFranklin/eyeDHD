import { configureStore, combineReducers } from '@reduxjs/toolkit'

import globalReducer from '../data/features/global';
import userReducer from '../data/features/user';

/**
 * Main data store for the app, combines reducers for global app state and user-specific
 * data. Global state includes things like alerts and loading states, while user state
 * includes things like project directory, list of cases, and selected case.
 *
 * Used for data that needs to persist after page navigation / reloads.
 *
 * TODO: set up some kind of backend synchronization for the Redux store.
 */

const root = combineReducers({
  global: globalReducer,
  user: userReducer
})

export const store = configureStore({
	reducer: root
});

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch