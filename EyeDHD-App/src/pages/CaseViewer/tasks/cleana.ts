import { Task } from '.';

const waiting = 'Clean data';
const running = 'Cleaning data...';

const fn = (useSelector, dispatch) => {

}

export const cleanTask: Task = {
	names: { waiting, running },
	fn
}