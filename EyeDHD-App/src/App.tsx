import React, { useEffect } from 'react';
import { Outlet } from 'react-router';

import { AlertWindow, Navbar } from '@src/components';
import { AlertControls } from '@src/components/AlertWindow';

import RemoteStream from '@src/data/RemoteStream';
import { CaseData } from '@src/data/types';
import { useDispatch } from '@src/data/hooks';
import { setLoading, showAlert } from '@src/data/features/global';
import { setCases, setProjectDir, setProjectInitialized } from '@src/data/features/user';

import '@src/App.css';

/**
 * Main app component, handles loading user data on startup and showing either the
 * directory selection window or the main app content based on whether a project directory
 * is set and initialized. Also renders global alert window and navbar.
 */
function App() {
	const dispatch = useDispatch();

	const handleError = (err: Error) => {
		AlertControls.error(`Error: ${err.message}`);
	};

	const loadUserData = async () => {
		const user = await window.electron.user.read();

		if (!user.dir || !user.project_initialized) {
			// We should prompt user for a new project folder at this point
			return;
		}

		await window.electron.user.initializeManager(user);
		dispatch(setProjectDir(user.dir));
		dispatch(setProjectInitialized(!!user.project_initialized));

		const stream = await RemoteStream.create('CaseData', {});
		let cases = await stream.collect<CaseData>();

		const { recoveries, deleted } = await window.electron.case.verifyFiles();
		if (recoveries.length > 0 || deleted.length > 0) {
			const refreshStream = await RemoteStream.create('CaseData', {});
			cases = await refreshStream.collect<CaseData>();

			const parts: string[] = [];
			if (deleted.length > 0) {
				parts.push(`${deleted.length} case(s) removed (folder missing): ${deleted.join(', ')}`);
			}
			if (recoveries.length > 0) {
				parts.push(`${recoveries.length} case(s) had task flags reset (output files missing): ${recoveries.map(r => r.caseName).join(', ')}`);
			}
			dispatch(showAlert({
				color: 'red',
				message: `Startup integrity check: ${parts.join(' — ')}. Re-create removed cases or re-run affected tasks from the Processing page.`
			}));
		}

		dispatch(setCases(cases));
	};

	useEffect(() => {
		loadUserData().catch(handleError).then(() => dispatch(setLoading(false)));
	}, []);

	return (
		<>
			<Navbar />
			<AlertWindow />
			<main className="app-content">
				<img
					className="app-background-logo"
					src="./images/sight-logo-transparent.png"
					alt="SIGHT logo"
				/>
				<div className="app-page">
					<Outlet />
				</div>
			</main>
		</>
	);
}

export default App;