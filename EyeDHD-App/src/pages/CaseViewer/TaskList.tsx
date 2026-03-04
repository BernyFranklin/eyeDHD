import React, { useEffect } from "react";

import { AlertControls } from "@src/components/AlertWindow";
import { useDispatch, useSelector } from "@src/data/hooks";
import { selectCurrentTask, setNextTask } from "@src/data/features/task";

import { TASKS } from './tasks';
import TaskItem from "./TaskItem";

export default function TaskList() {
	const dispatch = useDispatch();
	const current = useSelector(selectCurrentTask);

	useEffect(() => {
		dispatch(setNextTask());
	}, []);

	useEffect(() => {
		if (current === 'complete') {
			AlertControls.show('All tasks complete!', 'green');
		}
	}, [current]);

	return (
		<>
			<div>
				<ul className='task-list'>
					{TASKS.map(task => {
						return (
							<li key={task.name}>
								<TaskItem task={task} />
							</li>
						);
					})}
				</ul>
			</div>
			<style>
				{`
					.task-list {
						display: flex;
						flex-direction: column;
						width: 100%;
						justify-content: center;
						align-items: center;
						gap: 0.5rem;
						padding: 10px;
						margin: 0;
						list-style: none;
					}
				`}
			</style>
		</>
	);
}