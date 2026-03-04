import { SelectorHook, Dispatch } from '@src/data/hooks';

export { cleanTask } from './clean';
export { detectTask } from './detect';
export { visualizeTask } from './visualize';
export { animateTask } from './animate';
export { stitchTask } from './stitch';

export type Task = {
	names: {
		waiting: string,
		running: string
	},
	fn: TaskFn
}

type TaskReturn = void | Promise<void>;
export type TaskFn = (useSelector: SelectorHook, dispatch: Dispatch) => TaskReturn;