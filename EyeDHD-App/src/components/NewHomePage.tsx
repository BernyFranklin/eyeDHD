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
import { selectCases, selectProjectDir, selectProjectInitialized, setCases, setProjectDir, setProjectInitialized } from '../store/features/user';

export default function HomePage() {
	const dispatch = useDispatch();
	const user_dir = useSelector(selectProjectDir);
	const projectInitialized = useSelector(selectProjectInitialized);
	const cases = useSelector(selectCases);

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
			<div className='home-layout'>
				<div className='cases-col'>
					<p>Open Cases</p>
					<div className={`cases-list-wrapper${cases.length === 0 ? ' cases-list-wrapper--empty' : ''}`}>
						<CaseList loading={loading} />
						<Button
							onClick={() => setShowCreateCase(true)}
							height='45px'
							padding='10px 16px'
							style={{ marginLeft: '10px' }}
						>
							+
						</Button>
					</div>
				</div>

			</div>

			<style>{`
				.home-layout {
					display: flex;
					align-items: stretch;
					width: 100%;
					height: 100%;
					flex: 1;
					gap: 24px;
					padding: 15px;
					box-sizing: border-box;
					overflow: hidden;
					min-height: 0;
				}

				.cases-col {
					display: flex;
					justify-content: center;
					align-items: flex-start;
					align-self: flex-start;
					gap: 0;
					height: 100%;
					flex: 0 0 auto;
					padding-left: 100px;
					padding-top: 100px;
				}



				.cases-col p {
					margin: 10px 16px 0 0;
				}

				.cases-list-wrapper {
					display: flex;
					width: 20%;
					min-width: 400px;
					min-height: 60px;
					align-items: flex-start;
					border: 2px solid #ccc;
					padding: 10px;
				}

				.cases-list-wrapper .btn {
					margin-top: 10px;
				}

				.cases-list-wrapper--empty {
					align-items: center;
				}

				.cases-list-wrapper--empty .btn {
					margin-top: 0;
				}
			`}</style>
		</>
	);
}