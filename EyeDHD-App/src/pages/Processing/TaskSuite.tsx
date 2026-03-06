import React, { useEffect, useState } from "react";

import { Button } from "@src/components";
import { AlertControls } from "@src/components/AlertWindow";

import { useDispatch, useSelector } from "@src/data/hooks";
import { selectCurrentTask, initializeTask, setNextTask, selectTaskError } from "@src/data/features/task";

import { TASKS } from './tasks';
import TaskItem from "./TaskItem";


/**
 * Component for displaying the list of tasks that need to be completed to process a case,
 * as well as a button to start processing.
 *
 * Listens to changes in the current task and updates the button text and error states
 * accordingly.
 */
export default function TaskSuite() {
	const dispatch = useDispatch();
	const current = useSelector(selectCurrentTask);
	const error = useSelector(selectTaskError);

	const [buttonText, setButtonText] = useState('Start processing');

	const onclick = () => {
		if (error) {
			dispatch(initializeTask());
		}
		dispatch(setNextTask());
	}

	useEffect(() => {
		if (current === null && !error) {
			dispatch(initializeTask());
		}
	}, [current, error, dispatch]);

	useEffect(() => {
		if (error) {
			setButtonText('Failed! Try again');
			AlertControls.error(`
				An unexpected error occurred during ${current.toUpperCase()}:

				${error.message}
			`.trim());
			return;
		}

		if (current === 'complete') {
			setButtonText('All tasks complete!');
		} else if (current === null) {
			setButtonText('Start processing');
		} else {
			setButtonText('Processing...');
		}
	}, [current, error]);

	return (
		<>
			<div className='task-list-container'>
				<ul className='task-list'>
					{TASKS.map((task, i) => {
						return (
							<li key={i}>
								<TaskItem task={task} />
							</li>
						);
					})}
				</ul>
				<div className='task-button'>
					<Button onClick={onclick}
						disabled={!error && current !== null}
					>
						{buttonText}
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