import React, { useEffect } from 'react';
import { Outlet } from 'react-router';

import '@src/App.css';
import { AlertWindow, Navbar } from '@src/components';

import { CaseData } from '@src/data/types';
import RemoteStream from '@src/data/RemoteStream';
import { useDispatch } from '@src/data/hooks';
import { showAlert, setLoading } from '@src/data/features/global';
import { setCases, setProjectDir, setProjectInitialized } from '@src/data/features/user';

/**
 * Main app component, handles loading user data on startup and showing either the
 * directory selection window or the main app content based on whether a project directory
 * is set and initialized. Also renders global alert window and navbar.
 */
function App() {
	const dispatch = useDispatch();

	const handleError = (err: Error) => {
		dispatch(showAlert({ color: 'red', message: `Error: ${err.message}` }));
	};

	const loadUserData = async () => {
		const user = await window.electron.user.read();

		if (!user.dir || !user.project_initialized) {
			// We should prompt user for a new project folder at this point
			return;
		}

		console.log('Dir exists and initialized');

		await window.electron.user.initializeManager(user);
		dispatch(setProjectDir(user.dir));
		dispatch(setProjectInitialized(!!user.project_initialized));

		const stream = await RemoteStream.create('CaseData', {});
		const cases = await stream.collect<CaseData>();

		console.log('Cases loaded', cases);

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
					src="./images/eyedhd-logo-transparent.png"
					alt="EyeDHD logo"
				/>
				<div className="app-page">
					<Outlet />
				</div>
			</main>
		</>
	);
}

export default App;