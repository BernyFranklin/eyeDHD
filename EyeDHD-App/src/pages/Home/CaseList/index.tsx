import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

import CaseItem from "./CaseItem";
import { LoadingOverlay } from '@src/components';
import { AlertControls } from '@src/components/AlertWindow';

import RemoteStream from '@src/data/RemoteStream';
import { type CaseData } from '@src/data/types';
import { useSelector, useDispatch } from '@src/data/hooks';
import { selectCases, selectProjectDir, setCases, setSelectedCase } from '@src/data/features/user';

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
		navigate('/case');
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
				AlertControls.show(`Error loading cases: ${err.message}`, 'red');
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
						return <li>
							<CaseItem file={file} onClick={openCase} />
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