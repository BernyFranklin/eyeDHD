import React from 'react';

import { useSelector } from '@src/data/hooks';
import { selectCurrentTask } from '@src/data/features/task';

import CaseConfig from './CaseConfig';

export default function Preview() {
	const current = useSelector(selectCurrentTask);
	const showConfig = current === null;

	return (
		<>
			<div className='preview-window'>
				{showConfig && <CaseConfig />}
			</div>
			<style>
				{`
					.preview-window {
						border: 1px solid black;
						border-radius: var(--action-radius);
						width: 100%;
						height: 100%;
						background: rgba(200, 200, 200, 0.8);
						overflow-y: auto;
					}
				`}
			</style>
		</>
	)
}