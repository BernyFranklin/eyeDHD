import React, { useEffect, useState } from "react";

import TaskItem, { type Task } from "./TaskItem";

import { AlertControls } from "@src/components/AlertWindow";

export default function TaskList() {
	const [clean, setClean] = useState(false);
	const [animate, setAnimate] = useState(false);
	const [detect, setDetect] = useState(false);
	const [visualize, setVisuals] = useState(false);

	const [cleanProgress, setCleanProgress] = useState(0);
	const [animateProgress, setAnimateProgress] = useState(0);
	const [detectProgress, setDetectProgress] = useState(0);
	const [visualsProgress, setVisualsProgress] = useState(0);

	const waitForPaint = () => new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve());
	});

	const delay = (ms: number) => new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

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

		setClean(false);
		setAnimate(true);
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

		setAnimate(false);
		setDetect(true);
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

		setDetect(false);
		setVisuals(true);
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

		setVisuals(false);
	}};

	useEffect(() => {
		setClean(true);
	}, []);

	return (
		<>
			<div>
				<ul className='task-list'>
					<TaskItem
						task={cleanData}
						start={clean}
						progress={cleanProgress}
					/>
					<TaskItem
						task={generateAnimation}
						start={animate}
						progress={animateProgress}
					/>
					<TaskItem
						task={detectSaccades}
						start={detect}
						progress={detectProgress}
					/>
					<TaskItem
						task={generateVisuals}
						start={visualize}
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