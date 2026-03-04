import { Task } from '.';

const waiting = 'Animate eye movements';
const running = 'Animating eye movements...';

const fn = (useSelector, dispatch) => {

}

export const animateTask: Task = {
	names: { waiting, running },
	fn
}