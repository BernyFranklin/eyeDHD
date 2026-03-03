import React from "react";

import { useDispatch, useSelector } from "@src/data/hooks";
import { showAlert } from "@src/data/features/global";
import { selectSelectedCase } from "@src/data/features/user";
import { LoadingCircle } from "@src/components/extra/LoadingCircle/LoadingCircle";
import { ProgressCircle } from "@src/components/extra/ProgressCircle/ProgressCircle";

export default function TaskList() {
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
						<span className='task-name'>Cleaning data</span>
						<div className='task-progress'>
							<LoadingCircle size={30} />
						</div>
					</li>
					<li className='task-item'>
						<span className='task-name'>Generate animation</span>
						<div className='task-progress'>
							<ProgressCircle value={0.0} size={30}/>
						</div>
					</li>
					<li className='task-item'>
						<span className='task-name'>Detect saccades</span>
						<div className='task-progress'>
							<ProgressCircle value={0.0} size={30}/>
						</div>
					</li>
					<li className='task-item'>
						<span className='task-name'>Create visuals</span>
						<div className='task-progress'>
							<ProgressCircle value={0.0} size={30}/>
						</div>
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