import React from 'react';

import DirPrompt from './components/DirPrompt';
import CaseList from './components/CaseList';

import { useSelector } from './store/hooks';
import { selectProjectDir } from './store/features/user';

export default function HomePage() {
	const projectDir = useSelector(selectProjectDir);
	if (projectDir === null) {
		return <DirPrompt />;
	}

	return (
		<>
			<div>
				<CaseList />
			</div>

			<style>
				{`

				`}
			</style>
		</>
	);
}