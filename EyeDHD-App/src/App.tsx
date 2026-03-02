import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router';

import './App.css';
import { AlertWindow, ChooseDirWindow, Navbar } from './components';

import { selectProjectDir, selectProjectInitialized, setCases, setProjectDir, setProjectInitialized } from './data/features/user';
import { useDispatch, useSelector } from './data/hooks';
import { showAlert } from './data/features/global';

import { CaseData } from './types';
import RemoteStream from './data/RemoteStream';

function App() {
	const dispatch = useDispatch();

	const user_dir = useSelector(selectProjectDir);
	const projectInitialized = useSelector(selectProjectInitialized);

	const [loading, setLoading] = useState(true);

	const handleError = (err: Error) => {
		dispatch(showAlert({ color: 'red', message: `Error: ${err.message}` }));
	};

	const loadUserData = async () => {
		const user = await window.electron.user.read();

		if (!user.dir || !user.project_initialized) {
			// We should prompt user for project folder at this point
			dispatch(setCases([]));
			return;
		}

		const initializedUser = await window.electron.user.initializeDirectory(
			user.dir,
			user
		);
		if (initializedUser.dir) {
			dispatch(setProjectDir(initializedUser.dir));
		}
		dispatch(setProjectInitialized(!!initializedUser.project_initialized));


		const stream = await RemoteStream.create('CaseData', {});
		const cases = await stream.collect<CaseData>();

		dispatch(setCases(cases));

		setLoading(false);
	};

	useEffect(() => {
		loadUserData().catch(handleError).then(() => setLoading(false));
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
					{loading || !user_dir || !projectInitialized
						? <ChooseDirWindow loading={loading} />
						: <Outlet />
					}
				</div>
			</main>
		</>
	);
}

export default App;