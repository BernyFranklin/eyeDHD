import React, { useEffect } from 'react';

import { ProgressCircle } from '@src/components';
import { AlertControls } from '@src/components/AlertWindow';

import { Task } from './tasks/index';
import { useDispatch, useSelector } from '@src/data/hooks';
import { selectCurrentTask, selectTaskProgress, setNextTask } from '@src/data/features/task';

type Props = {
	task: Task
};

export default function TaskItem({ task }: Props) {
	const dispatch = useDispatch();
	const current = useSelector(selectCurrentTask);
	const progress = useSelector(selectTaskProgress);

	const handleError = (err: Error) => {
		AlertControls.show(`Task ${task.name} had error: ${err.message}`, 'red');
	}

	useEffect(() => {
		if (current === task.name) {
			task.fn(dispatch).catch(handleError).then(() => {
				dispatch(setNextTask());
			});
		}
	}, [current]);

	const getTaskName = () => {
		if (current === task.name) {
			return task.display.running;
		}
		return task.display.waiting;
	}

	return (
		<>
			<div className={`task-item ${current === task.name
				? 'active-task'
				: undefined}
			`}>
				<span className='task-name'>{getTaskName()}</span>
				<div className='task-progress'>
					{current === task.name &&
						<ProgressCircle value={progress} size={30} />
					}
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