import React, { useEffect } from "react";

import { AlertControls } from "@src/components/AlertWindow";
import { useDispatch, useSelector } from "@src/data/hooks";
import { selectCurrentTask, initializeTask, setNextTask } from "@src/data/features/task";

import { TASKS } from './tasks';
import TaskItem from "./TaskItem";
import { Button } from "@src/components";

export default function TaskList() {
	const dispatch = useDispatch();
	const current = useSelector(selectCurrentTask);

	const onclick = () => {
		dispatch(setNextTask());
	}

	useEffect(() => {
		dispatch(initializeTask());
	}, []);

	useEffect(() => {
		if (current === 'complete') {
			AlertControls.show('All tasks complete!', 'green');
		}
	}, [current]);

	return (
		<>
			<div className='task-list-container'>
				<ul className='task-list'>
					{TASKS.map(task => {
						return (
							<li key={task.name}>
								<TaskItem task={task} />
							</li>
						);
					})}
				</ul>
				<div className='task-button'>
					<Button onClick={onclick}
						disabled={current !== 'none'}
					>
						Start processing
					</Button>
				</div>
			</div>
			<style>
				{`
					.task-list-container {
						display: flex;
						flex-direction: column;
						align-items: center;
					}

					.task-button {
						width: 300px;
						display: flex;
						justify-content: flex-start;
					}

					.task-list {
						display: flex;
						flex-direction: column;
						width: 300px;
						justify-content: center;
						align-items: center;
						gap: 0.5rem;
						padding: 10px 0;
						margin: 0;
						list-style: none;
					}
				`}
			</style>
		</>
	);
}