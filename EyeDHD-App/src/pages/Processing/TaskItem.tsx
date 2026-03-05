import React, { useEffect, useState } from 'react';

import { ProgressCircle, Status } from '@src/components';

import { useDispatch, useSelector } from '@src/data/hooks';
import { selectCurrentTask, selectTaskProgress, setNextTask, setTaskError } from '@src/data/features/task';

import { Task } from './tasks/index';
import { selectSelectedCase } from '@src/data/features/user';
import { CaseData } from '@src/data/types';

type Props = {
	task: Task
};

const getCompletion = (task: Task, trial: CaseData | null) => {
	if (!trial?.completed) {
		return false;
	}

	switch (task.name) {
		case 'cleaning':
			return trial.completed.cleaning;
		case 'detecting':
			return trial.completed.detecting;
		case 'visualizing':
			return trial.completed.visualizing;
		case 'animating':
			return trial.completed.animating;
		case 'stitching':
			return trial.completed.stitching;
		default:
			return false;
	}
}

/**
 * Component for displaying the status of an individual task, including progress and
 * error states.
 *
 * Listens to changes in the current task and updates its state accordingly.
 */
export default function TaskItem({ task }: Props) {
	const dispatch = useDispatch();
	const trial = useSelector(selectSelectedCase);
	console.log('rendering task item', task.name, getCompletion(task, trial));
	const current = useSelector(selectCurrentTask);
	const progress = useSelector(selectTaskProgress);

	const [active, setActive] = useState(false);
	const [failed, setFailed] = useState(false);
	const [complete, setComplete] = useState(getCompletion(task, trial));

	const handleError = (err: Error) => {
		setFailed(true);
		setActive(false);
		dispatch(setTaskError(err));
	}

	useEffect(() => {
		setComplete(getCompletion(task, trial));
	}, [task.name, trial]);

	useEffect(() => {
		setActive(false);
		setFailed(false);
	}, [trial?.id]);

	useEffect(() => {
		if (!trial) {
			return;
		}
		if (current !== task.name) {
			return;
		}

		if (getCompletion(task, trial)) {
			setComplete(true);
			setActive(false);
			dispatch(setNextTask());
			return;
		}

		setActive(true);
		task.fn(trial, dispatch)
			.then(() => {
				setActive(false);
				setComplete(true);
				dispatch(setNextTask());
			})
			.catch(handleError);
	}, [current, task.name, trial]);

	const getTaskName = () => {
		if (complete) {
			return task.display.completed;
		} else if (current === task.name) {
			return task.display.running;
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