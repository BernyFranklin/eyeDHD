import React, { useEffect, useState } from "react";

import { Button } from "@src/components";
import { AlertControls } from "@src/components/AlertWindow";
import { toUserMessage } from "@src/utils/userError";

import { useDispatch, useSelector } from "@src/data/hooks";
import {
	selectCurrentTask,
	initializeTask,
	setNextTask,
	selectTaskError,
	selectTaskSelected,
	setTaskSelected,
	setAllTasksSelected,
} from "@src/data/features/task";

import { TASKS, OPTIONAL_TASKS, type OptionalTaskName } from './tasks';
import TaskItem from "./TaskItem";

const OPTIONAL_LABELS: Record<OptionalTaskName, string> = {
	detection: 'Detect Saccades',
	pupil: 'Pupil Dilation',
	animation: 'Generate Animation',
};


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
	const selected = useSelector(selectTaskSelected);

	const [buttonText, setButtonText] = useState('Start processing');

	const processing = !error && current !== null && current !== 'complete';
	const allSelected = OPTIONAL_TASKS.every(name => selected[name]);

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
			AlertControls.error(
				toUserMessage(
					error,
					`The ${current?.toUpperCase() ?? 'processing'} step could not finish. Please try again.`
				)
			);
			return;
		}

		if (current === 'complete') {
			setButtonText('All Tasks Complete!');
		} else if (current === null) {
			setButtonText('Start Processing');
		} else {
			setButtonText('Processing...');
		}
	}, [current, error]);

	return (
		<>
			<div className='task-list-container'>
				<div className='task-select-panel'>
					<label className='task-select-row task-select-all'>
						<input
							type='checkbox'
							checked={allSelected}
							disabled={processing}
							onChange={e => dispatch(setAllTasksSelected(e.target.checked))}
						/>
						<span>Select All</span>
					</label>
					{OPTIONAL_TASKS.map(name => (
						<label key={name} className='task-select-row'>
							<input
								type='checkbox'
								checked={selected[name]}
								disabled={processing}
								onChange={e => dispatch(setTaskSelected({ name, value: e.target.checked }))}
							/>
							<span>{OPTIONAL_LABELS[name]}</span>
						</label>
					))}
				</div>
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
						align-items: stretch;
						width: max-content;
						min-width: 300px;
					}

					.task-button {
						width: 100%;
						display: flex;
						justify-content: flex-start;
					}

					.task-select-panel {
						display: flex;
						flex-direction: column;
						gap: 0.35rem;
						padding: 10px 12px;
						margin-bottom: 0.5rem;
						background: #F0F0F0;
						border: 1px solid #ccc;
						border-radius: var(--action-radius);
					}

					.task-select-row {
						display: flex;
						align-items: center;
						gap: 0.5rem;
						font-size: 0.95rem;
						color: #333;
						cursor: pointer;
						user-select: none;
					}

					.task-select-row input[type='checkbox']:disabled {
						cursor: not-allowed;
					}

					.task-select-row input[type='checkbox']:disabled + span {
						color: #888;
						cursor: not-allowed;
					}

					.task-select-all {
						font-weight: 600;
						padding-bottom: 0.35rem;
						border-bottom: 1px solid #d8d8d8;
					}

					.task-list {
						display: flex;
						flex-direction: column;
						width: 100%;
						justify-content: center;
						align-items: stretch;
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