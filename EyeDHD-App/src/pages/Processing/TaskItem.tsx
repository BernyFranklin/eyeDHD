import React, { useEffect, useState } from 'react';

import { ProgressCircle, Status } from '@src/components';

import { Task } from './tasks/index';
import { useDispatch, useSelector } from '@src/data/hooks';
import { selectCurrentTask, selectTaskProgress, setNextTask, setTaskError } from '@src/data/features/task';

type Props = {
	task: Task
};

/**
 * Component for displaying the status of an individual task, including progress and
 * error states.
 *
 * Listens to changes in the current task and updates its state accordingly.
 */
export default function TaskItem({ task }: Props) {
	const dispatch = useDispatch();
	const current = useSelector(selectCurrentTask);
	const progress = useSelector(selectTaskProgress);

	const [active, setActive] = useState(false);
	const [failed, setFailed] = useState(false);
	const [complete, setComplete] = useState(false);

	const handleError = (err: Error) => {
		setFailed(true);
		setActive(false);
		dispatch(setTaskError(err));
	}

	useEffect(() => {
		if (current === task.name) {
			setActive(true);
			task.fn(dispatch)
				.then(() => {
					setActive(false);
					setComplete(true);
					dispatch(setNextTask());
				})
				.catch(handleError);
		}
	}, [current]);

	const getTaskName = () => {
		if (current === task.name) {
			return task.display.running;
		} else if (complete) {
			return task.display.completed;
		}
		return task.display.waiting;
	}

	const getStatus = () => {
		if (failed) {
			return <Status state='error' />;
		}

		if (complete) {
			return <Status state='success' />;
		}

		if (current === task.name) {
			return <ProgressCircle value={progress} size={30} />;
		}

		return <Status state='pending' />;
	}

	return (
		<>
			<div className={[
				'task-item',
				failed && 'failed-task',
				complete && 'success-task',
				active && 'active-task'
			].filter(Boolean).join(' ')}>
				<span className='task-name'>{getTaskName()}</span>
				<div className='task-progress'>
					{getStatus()}
				</div>
			</div>
			<style>
				{`
					.task-item {
						background: #F0F0F0;
						color: #A0A0A0;
						display: flex;
						align-items: center;
						justify-content: space-between;
						padding: 10px;
						width: 300px;
						border: 1px solid #ccc;
						border-radius: var(--action-radius);
						margin-bottom: 10px;
						transition: background-color 0.2s ease;
					}

					.active-task {
						background-color: #e0e0e0;
						font-weight: bold;
						color: #333;
						border-color: #999;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
						animation: pulse 2s infinite;
					}

					.failed-task {
						background-color: #ffe0e0;
						font-weight: bold;
						color: #a00;
						border-color: #900;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
						animation: pulse 2s infinite;
					}

					.success-task {
						background-color: #e0ffe0;
						font-weight: bold;
						color: #0a0;
						border-color: #090;
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
						animation: pulse 2s infinite;
					}

					.task-name {
						padding-left: 5px;
					}

					.task-progress {
						margin-left: auto;
						padding-right: 5px;
						display: flex;
						align-items: center;
						height: 100%;
					}
				`}
			</style>
		</>
	);
}