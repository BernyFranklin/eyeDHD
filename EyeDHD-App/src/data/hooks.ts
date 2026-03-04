import { useDispatch as reduxDispatch, useSelector as reduxSelector } from 'react-redux'

import type { RootState, AppDispatch } from '.'

/**
 * Custom hooks for accessing the Redux store, with types for the app's specific state
 * and dispatch types.
 *
 * These hooks can be used throughout the app to access and update the global state in a
 * type-safe way.
 */

export const useDispatch = reduxDispatch.withTypes<AppDispatch>()
export type Dispatch = ReturnType<typeof useDispatch>;

export const useSelector = reduxSelector.withTypes<RootState>()
export type SelectorHook = typeof useSelector;