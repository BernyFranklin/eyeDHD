import React, { useEffect, useState } from 'react';

import LoadingOverlay from './components/LoadingOverlay';
import DirPrompt from './components/DirPrompt';
import CaseList from './components/CaseList';

import RemoteStream from './data/RemoteStream';
import { CaseData } from './types';
import { useDispatch, useSelector } from './store/hooks';
import { showAlert } from './store/features/global';
import { selectProjectDir, selectProjectInitialized, setCases, setProjectDir, setProjectInitialized } from './store/features/user';

export default function HomePage() {
	const dispatch = useDispatch();
	const user_dir = useSelector(selectProjectDir);
	const projectInitialized = useSelector(selectProjectInitialized);

	const [loading, setLoading] = useState(true);

	const handleError = (err: Error) => {
		dispatch(showAlert({ color: 'red', message: `Error: ${err.message}` }));
	};

	const loadUserData = async () => {
		try {
			const user = await window.electron.user.read();

			if (user.dir && user.dir !== user_dir) {
				dispatch(setProjectDir(user.dir));
			}
			if (!!user.project_initialized !== !!projectInitialized) {
				dispatch(setProjectInitialized(!!user.project_initialized));
			}

			if (!user.dir || !user.project_initialized) {
				dispatch(setCases([]));
				return;
			}

			const initializedUser = await window.electron.user.initializeDirectory(user);
			if (initializedUser.dir && initializedUser.dir !== user_dir) {
				dispatch(setProjectDir(initializedUser.dir));
			}
			dispatch(setProjectInitialized(!!initializedUser.project_initialized));

			const stream = await RemoteStream.create('CaseData', {});
			const cases = await stream.collect<CaseData>();

			dispatch(setCases(cases));
		} catch (err) {
			handleError(err);
		}
	};

	useEffect(() => {
		loadUserData().catch(handleError).then(() => setLoading(false));
	}, [user_dir, projectInitialized]);

	return (
		<>
			<LoadingOverlay isLoading={loading} />
			<DirPrompt loading={loading} />
			<div>
				<CaseList loading={loading} />
			</div>

			<style>{`

			`}</style>
		</>
	);
}