import React, { useEffect } from "react";
import { useNavigate } from "react-router";

import TaskSuite from "./TaskSuite";
import Preview from "./Preview";

import { useSelector } from "@src/data/hooks";
import { selectSelectedCase } from "@src/data/features/user";

/**
 * Page for viewing a case, shows progress of data processing as a list of tasks
 * and showing a preview window of the active task.
 */
export default function Processing() {
	const selectedCase = useSelector(selectSelectedCase);
	const navigate = useNavigate();

	useEffect(() => {
		if (!selectedCase) navigate('/');
	}, [selectedCase])

	if (!selectedCase) return null;

	return (
		<>
			<div className="processing-layout">
				<div className="processing-task-pane">
					<div className="processing-task-list">
						<h1 className="case-name-header">{selectedCase.name}</h1>
						<TaskSuite />
					</div>
				</div>
				<div className="processing-preview-pane">
					<div className="processing-preview">
						<Preview />
					</div>
				</div>
			</div>
			<style>
				{`
					.processing-layout {
						display: grid;
						grid-template-columns: 1fr 2fr;
						width: 100%;
						height: 100%;
					}

					.processing-task-pane {
						display: flex;
						justify-content: center;
						align-items: flex-start;
						padding: 48px;
					}

					.processing-task-list {
						width: auto;
						display: flex;
						flex-direction: column;
						align-items: left;
					}

					.case-name-header {
						width: auto;
						text-align: left;
						font-size: 1.5rem;
						margin: 0 0 1rem 0;
						color: #13284c;
					}

					.processing-preview-pane {
						display: flex;
						align-items: center;
						justify-content: stretch;
						padding: 48px;
						width: auto;
						height: auto;
					}

					.processing-preview {
						width: 100%;
						height: 100%;
					}
				`}
			</style>
		</>
	);
}