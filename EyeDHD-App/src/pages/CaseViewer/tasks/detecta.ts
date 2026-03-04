import { Task } from '.';

const waiting = 'Detect saccades';
const running = 'Detecting saccades...';

const fn = (useSelector, dispatch) => {

}

export const detectTask: Task = {
	names: { waiting, running },
	fn
}