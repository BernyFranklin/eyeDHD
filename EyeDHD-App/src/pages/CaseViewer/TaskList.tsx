import React, { useEffect, useState } from "react";

import TaskItem, { type Task } from "./TaskItem";

import { AlertControls } from "@src/components/AlertWindow";

const waitForPaint = () => new Promise<void>((resolve) => {
	requestAnimationFrame(() => resolve());
});

const delay = (ms: number) => new Promise<void>((resolve) => {
	setTimeout(resolve, ms);
});

export default function TaskList() {
	const [startCleaning, setStartCleaning] = useState(false);
	const [cleanProgress, setCleanProgress] = useState(0);

	const [startAnimating, setStartAnimating] = useState(false);
	const [animateProgress, setAnimateProgress] = useState(0);

	const [startDetecting, setStartDetecting] = useState(false);
	const [detectProgress, setDetectProgress] = useState(0);

	const [startVisualizing, setStartVisualizing] = useState(false);

	const [visualsProgress, setVisualsProgress] = useState(0);

	const handleError = (err: Error) => {
		AlertControls.show(`Error: ${err.message}`, 'red');
	};

	const cleanData = { name: 'Cleaning data', fn: async () => {
		setCleanProgress(0);

		let percent = 0;
		while (percent < 100) {
			await delay(10);

			percent = percent + 1;
			setCleanProgress(percent);
		}


		await waitForPaint();
		await delay(150);

		setStartCleaning(false);
		setStartAnimating(true);
	}};

	const generateAnimation = { name: 'Generate animation', fn: async () => {
		setAnimateProgress(0);

		let percent = 0;
		while (percent < 100) {
			await delay(10);

			percent = percent + 1;
			setAnimateProgress(percent);
		}


		await waitForPaint();
		await delay(150);

		setStartAnimating(false);
		setStartDetecting(true);
	}};

	const detectSaccades = { name: 'Detect saccades', fn: async () => {
		setDetectProgress(0);

		let percent = 0;
		while (percent < 100) {
			await delay(10);

			percent = percent + 1;
			setDetectProgress(percent);
		}


		await waitForPaint();
		await delay(150);

		setStartDetecting(false);
		setStartVisualizing(true);
	}};

	const generateVisuals = { name: 'Generate visuals', fn: async () => {
		setVisualsProgress(0);

		let percent = 0;
		while (percent < 100) {
			await delay(10);

			percent = percent + 1;
			setVisualsProgress(percent);
		}


		await waitForPaint();
		await delay(150);

		setStartVisualizing(false);
	}};

	useEffect(() => {
		setStartCleaning(true);
	}, []);

	return (
		<>
			<div>
				<ul className='task-list'>
					<TaskItem
						task={cleanData}
						start={startCleaning}
						progress={cleanProgress}
					/>
					<TaskItem
						task={generateAnimation}
						start={startAnimating}
						progress={animateProgress}
					/>
					<TaskItem
						task={detectSaccades}
						start={startDetecting}
						progress={detectProgress}
					/>
					<TaskItem
						task={generateVisuals}
						start={startVisualizing}
						progress={visualsProgress}
					/>
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