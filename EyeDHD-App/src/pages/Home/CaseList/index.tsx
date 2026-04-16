import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { LoadingOverlay } from '@src/components';
import { AlertControls } from '@src/components/AlertWindow';

import RemoteStream from '@src/data/RemoteStream';
import { type CaseData } from '@src/data/types';
import { useSelector, useDispatch } from '@src/data/hooks';
import { selectCases, selectProjectDir, setCases, setSelectedCase } from '@src/data/features/user';

import CaseItem from "./CaseItem";

type Props = {
	loading: boolean;
};

/**
 * Component for displaying list of cases on the home page, allows user to click
 * on a case to open it. Refreshes list of cases when project directory is set
 * or when loading state changes.
 */
export default function CaseList(props: Props) {
	const dir = useSelector(selectProjectDir);
	const cases = useSelector(selectCases);
	const dispatch = useDispatch();
	const navigate = useNavigate();

	const openCase = async (file: CaseData) => {
		dispatch(setSelectedCase(file));
		navigate('/processing');
	}

	const removeCase = async (file: CaseData) => {
		const confirmed = window.confirm(
			`Remove case "${file.name}"? This will permanently delete its folder and all imports/outputs.`
		);
		if (!confirmed) {
			return;
		}

		try {
			await window.electron.case.remove(file);
			dispatch(setCases(cases.filter(c => c.id !== file.id)));
			AlertControls.success(`Removed case: ${file.name}`);
		} catch (err) {
			AlertControls.error(`Error removing case: ${err.message}`);
		}
	}

	const updateCase = async (file: CaseData) => {
		try {
			const filepath = await window.electron.case.selectCsv();
			if (!filepath) {
				return;
			}

			const updated = await window.electron.case.importCsv(file, filepath);
			dispatch(setSelectedCase(updated));
			navigate('/processing');
		} catch (err) {
			AlertControls.error(`Error updating case: ${err.message}`);
		}
	}

	useEffect(() => {
		if (!dir || props.loading) {
			return;
		}

		const loadCases = async () => {
			try {
				const stream = await RemoteStream.create('CaseData', {});
				const cases = await stream.collect<CaseData>();
				dispatch(setCases(cases));
			} catch (err) {
				AlertControls.error(`Error loading cases: ${err.message}`);
			}
		};

		loadCases();
	}, [dir, props.loading, dispatch]);

	if (!dir || props.loading) {
		return null;
	}

	return (
		<>
			<div>
				{/* Lists all cases that have been opened and
					allows new cases to be opened
			  	*/}
				<ul className='case-list'>
					<LoadingOverlay isLoading={props.loading} />

					{/* Map cases into clickable list items w/
						right side ... button for options like
						deleting the case
					*/}
					{cases.map(file => {
						return <li key={file.id}>
							<CaseItem file={file} onClick={openCase} onUpdate={updateCase} onRemove={removeCase} />
						</li>
					})}

				</ul>
			</div>
			<style>{`
				.case-list {
					display: flex;
					flex-direction: column;
					width: 100%;
					justify-content: center;
					align-items: flex-start;
					gap: 0.5rem;
					padding: 0;
					margin: 0;
					list-style: none;
				}

				.case-list li:last-child .case-item {
					margin-bottom: 0;
				}
			`}</style>
		</>
	);
}