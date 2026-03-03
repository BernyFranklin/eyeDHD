import React, { useEffect, useState } from 'react';

import CaseList from './CaseList';
import CreateCaseWindow from './CreateCaseWindow';
import { Button, LoadingOverlay } from '@src/components';

import RemoteStream from '@src/data/RemoteStream';
import { type CaseData } from '@src/data/types';
import { useDispatch, useSelector } from '@src/data/hooks';
import { showAlert } from '@src/data/features/global';
import { selectCases, setCases } from '@src/data/features/user';

/**
 * Home page of the app, shows list of cases and allows user to create new cases
 * or open existing ones. Refreshes data from the backend on refresh/page load.
 */
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

			const stream = await RemoteStream.create('CaseData', {});
			const cases = await stream.collect<CaseData>();

			dispatch(setCases(cases));
			setLoading(false);
		} catch (err) {
			handleError(err);
			setLoading(false);
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
							width='45px'
							padding='10px 16px'
						>
							+
						</Button>
					</div>
				</div>
			</div>

			<style>
				{`
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
						justify-content: space-between;
						align-items: flex-start;
						border: 2px solid #ccc;
						border-radius: var(--action-radius);
						padding: 24px;
					}

					.cases-list-wrapper .btn {
						margin-top: 0;
					}

					.cases-list-wrapper--empty {
						align-items: center;
					}

					.cases-list-wrapper--empty .btn {
						margin-top: 0;
					}
				`}
			</style>
		</>
	);
}