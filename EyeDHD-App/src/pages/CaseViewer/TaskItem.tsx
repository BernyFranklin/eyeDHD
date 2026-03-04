import React, { useEffect } from 'react';

import { ProgressCircle } from '@src/components';

import { Task } from './tasks/index';

type Props = {
	task: Task,
	progress: number,
	start: boolean
};

export default function TaskItem(props: Props) {
	useEffect(() => {
		if (props.start) {
			props.task.fn();
		}
	}, [props.start]);

	const getTaskName = () => {
		if (props.start) {
			return props.task.names.running;
		}
		return props.task.names.waiting;
	}

	return (
		<>
			<div className={`task-item ${props.start ? 'active-task' : undefined}`}>
				<span className='task-name'>{getTaskName()}</span>
				<div className='task-progress'>
					{props.start &&
						<ProgressCircle value={props.progress} size={30} max={100} />
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
						width: 250px;
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