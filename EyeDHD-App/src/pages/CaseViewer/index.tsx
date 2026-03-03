import React from "react";

import TaskList from "./TaskList";
import Preview from "./Preview";

import { useSelector } from "@src/data/hooks";
import { selectSelectedCase } from "@src/data/features/user";

/**
 * Page for viewing a case, shows progress of data processing as a list of tasks
 * and will show a preview window of the active task. When processing is complete
 * an organized display of visualizations will be shown.
 */
export default function CaseViewer() {
	const selectedCase = useSelector(selectSelectedCase);

	return (
		<>
			<div className="case-viewer-layout">
				<div className="case-viewer-task-pane">
					<div className="case-viewer-task-list">
						<h1 className="case-name-header">{selectedCase.name}</h1>
						<TaskList />
					</div>
				</div>
				<div className="case-viewer-preview-pane">
					<div className="case-viewer-preview">
						<Preview />
					</div>
				</div>
			</div>
			<style>
				{`
					.case-viewer-layout {
						display: grid;
						grid-template-columns: 1fr 2fr;
						width: 100%;
						height: 100%;
					}

					.case-viewer-task-pane {
						display: flex;
						justify-content: center;
						align-items: flex-start;
						padding: 48px;
					}

					.case-viewer-task-list {
						width: 100%;
						max-width: 360px;
					}

					.case-name-header {
						font-size: 1.5rem;
						margin-bottom: 1rem;
					}

					.case-viewer-preview-pane {
						display: flex;
						align-items: center;
						justify-content: stretch;
						padding: 48px;
					}

					.case-viewer-preview {
						width: 100%;
						height: 100%;
					}
				`}
			</style>
		</>
	);
}