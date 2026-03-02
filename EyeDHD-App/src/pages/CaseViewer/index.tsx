import React from "react";

import { useDispatch, useSelector } from "@src/data/hooks";
import { showAlert } from "@src/data/features/global";
import { selectSelectedCase } from "@src/data/features/user";

/**
 * Page for viewing a case, shows progress of data processing as a list of tasks
 * and will show a preview window of the active task. When processing is complete
 * an organized display of visualizations will be shown.
 */
export default function CaseViewer() {
	const dispatch = useDispatch();
	const selectedCase = useSelector(selectSelectedCase);

	const handleError = (err: Error) => {
		dispatch(showAlert({ color: 'red', message: `Error: ${err.message}` }));
	};

	return (
		<>
			<div>
				{selectedCase.name}
				<ul className='task-list'>
					<li className='task-item active-task'>
						<span className='task-name'>Cleaning data...</span>
						<div className='task-progress'>()</div>
					</li>
					<li className='task-item'>
						<span className='task-name'>Generate animation</span>
						<div className='task-progress'>()</div>
					</li>
					<li className='task-item'>
						<span className='task-name'>Detect saccades</span>
						<div className='task-progress'>()</div>
					</li>
					<li className='task-item'>
						<span className='task-name'>Create visuals</span>
						<div className='task-progress'>()</div>
					</li>
				</ul>
			</div>
			<style>{`
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

				.task-item {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 10px;
					width: 200px;
					border: 1px solid #ccc;
					border-radius: 5px;
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
				}
			`}</style>
		</>
	);
}