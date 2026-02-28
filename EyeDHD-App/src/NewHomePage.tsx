import React, { useState } from 'react';

import DirPrompt from './components/DirPrompt';
import CaseList from './components/CaseList';

import { useDispatch } from './store/hooks';
import { setCases, setProjectDir } from './store/features/user';
import RemoteStream from './data/RemoteStream';
import { CaseData } from './types';
import LoadingOverlay from './components/LoadingOverlay';

export default function HomePage() {
	const dispatch = useDispatch();

	const [loading, setLoading] = useState(true);

	const handleError = (err: Error) => {
		// TODO: switch to alert window, have alert window rendered here,
		// and maybe store useAlert result in redux store so it can
		// be easily accessed by sub components
		console.error('Error loading user data:', err);
	};

	// Loads user data on startup into the redux store
	const loadUserData = async () => {
		const user = await window.electron.user.read();
		dispatch(setProjectDir(user.dir));

		const stream = await RemoteStream.create('CaseData', {});
		const cases = await stream.collect<CaseData>();

		const testing = [
			{
				id: 0,
				name: 'ID.001.csv',
				path: '/path/to/ID.001.csv',
				header: 'header,stuff',
				completed: 0,
				rows: 0,
				created_at: Date.now().toString(),
				updated_at: Date.now().toString()
			},
			{
				id: 1,
				name: 'ID.002.csv',
				path: '/path/to/ID.002.csv',
				header: 'header,stuff',
				completed: 0,
				rows: 0,
				created_at: Date.now().toString(),
				updated_at: Date.now().toString()
			},
			{
				id: 2,
				name: 'ID.003.csv',
				path: '/path/to/ID.003.csv',
				header: 'header,stuff',
				completed: 0,
				rows: 0,
				created_at: Date.now().toString(),
				updated_at: Date.now().toString()
			}
		];

		dispatch(setCases(testing));
	};

	loadUserData().catch(handleError).then(() => setLoading(false));

	return (
		<>
			<LoadingOverlay isLoading={loading} />
			<DirPrompt loading={loading} />
			<div>
				<CaseList loading={loading} />
			</div>

			<style>
				{`

				`}
			</style>
		</>
	);
}