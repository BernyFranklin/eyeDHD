import React, { useState } from 'react';

import DirPrompt from './components/DirPrompt';
import CaseList from './components/CaseList';

import { useDispatch, useSelector } from './store/hooks';
import { selectProjectDir, setCases, setProjectDir } from './store/features/user';
import RemoteStream from './data/RemoteStream';
import { CaseData, User } from './types';
import LoadingOverlay from './components/LoadingOverlay';

export default function HomePage() {
	const dispatch = useDispatch();
	const projectDir = useSelector(selectProjectDir);

	const [loading, setLoading] = useState(true);

	const handleError = (err: Error) => {
		// Switch to alert window, have alert window rendered here
		console.error('Error loading user data:', err);
	};

	const loadUserData = async () => {
		// Load user data stored in database / projects dir into redux store
		const user = await window.electron.user.read();
		dispatch(setProjectDir(user.dir));

		const stream = await RemoteStream.create('CaseData', {});
		const cases = await stream.collect<CaseData>();

		dispatch(setCases(cases));
	};

	loadUserData().catch(handleError).then(() => setLoading(false));

	return (
		<>
			<LoadingOverlay isLoading={loading} />
			<DirPrompt loading={loading} />
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