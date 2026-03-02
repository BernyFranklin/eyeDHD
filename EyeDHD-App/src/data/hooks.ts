import { useDispatch as reduxDispatch, useSelector as reduxSelector } from 'react-redux'
import type { RootState, AppDispatch } from '.'

export const useDispatch = reduxDispatch.withTypes<AppDispatch>()
export const useSelector = reduxSelector.withTypes<RootState>()