import { Task } from '.';

const waiting = 'Visualize data';
const running = 'Visualizing data...';

const fn = (useSelector, dispatch) => {

}

export const visualizeTask: Task = {
	names: { waiting, running },
	fn
}