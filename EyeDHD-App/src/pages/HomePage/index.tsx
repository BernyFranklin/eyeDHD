import React, { useEffect, useState } from 'react';

import { Button, LoadingOverlay } from '../../components';
import CaseList from './CaseList';
import CreateCaseWindow from './CreateCaseWindow';

import RemoteStream from '../../data/RemoteStream';
import { CaseData } from '../../types';
import { useDispatch, useSelector } from '../../data/hooks';
import { showAlert } from '../../data/features/global';
import { selectCases, setCases, setProjectDir, setProjectInitialized } from '../../data/features/user';

export default function HomePage() {
	const dispatch = useDispatch();
	const cases = useSelector(selectCases);

	const [loading, setLoading] = useState(true);
	const [showCreateCase, setShowCreateCase] = useState(false);

	const handleError = (err: Error) => {
		dispatch(showAlert({ color: 'red', message: `Error: ${err.message}` }));
	};

	const refresh = async () => {
		try {
			setLoading(true);

			const user = await window.electron.user.read();
			dispatch(setProjectDir(user.dir));
			dispatch(setProjectInitialized(!!user.project_initialized));

			const stream = await RemoteStream.create('CaseData', {});
			const cases = await stream.collect<CaseData>();

			dispatch(setCases(cases));
		} catch (err) {
			handleError(err);
		}
	};

	useEffect(() => {
		refresh().catch(handleError).then(() => setLoading(false));
	}, []);

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