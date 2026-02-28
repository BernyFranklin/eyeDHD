import React, { useEffect, useState } from 'react';

import LoadingOverlay from './LoadingOverlay';
import DirPrompt from './DirPrompt';
import CaseList from './CaseList';
import { CreateCaseWindow } from './CreateCaseWindow';
import Button from './Button';

import RemoteStream from '../data/RemoteStream';
import { CaseData } from '../types';
import { useDispatch, useSelector } from '../store/hooks';
import { showAlert } from '../store/features/global';
import { selectProjectDir, selectProjectInitialized, setCases, setProjectDir, setProjectInitialized } from '../store/features/user';

export default function HomePage() {
	const dispatch = useDispatch();
	const user_dir = useSelector(selectProjectDir);
	const projectInitialized = useSelector(selectProjectInitialized);

	const [loading, setLoading] = useState(true);
	const [showCreateCase, setShowCreateCase] = useState(false);

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

	if (!user_dir || !projectInitialized) {
		return <DirPrompt loading={loading} />;
	}

	return (
		<>
			<LoadingOverlay isLoading={loading} />
			<CreateCaseWindow
				isOpen={showCreateCase}
				onClose={() => setShowCreateCase(false)}
			/>
			<div className='cases-row'>
				<p>Open Cases</p>
				<div className='cases-list-wrapper'>
					<CaseList loading={loading} />
					<Button
						onClick={() => setShowCreateCase(true)}
						height='45px'
						padding='10px 16px'
						style={{ marginTop: '10px', marginLeft: '10px' }}
					>
						+
					</Button>
				</div>
			</div>

			<style>{`
				.cases-row {
					display: flex;
					justify-content: center;
					align-items: flex-start;
					gap: 0;
					width: 100%;
					height: 100%;
					padding: 15px;
				}

				.cases-row p {
					margin: 10px 16px 0 0;
				}

				.cases-list-wrapper {
					display: flex;
					width: 20%;
					min-width: 280px;
					min-height: 50px;
					align-items: flex-start;
					border: 1px solid #ccc;
					padding-top: 10px;
				}
			`}</style>
		</>
	);
}