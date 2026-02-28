import React from 'react';

import CaseItem from "./CaseItem";
import Button from '../Button';
import LoadingOverlay from '../LoadingOverlay';

import { type Error, type CaseData } from '../../types';
import { useSelector, useDispatch } from '../../store/hooks';
import { showAlert } from '../../store/features/global';
import { selectCases, selectProjectDir } from '../../store/features/user';

type Props = {
	loading: boolean;
};

export default function CaseList(props: Props) {
	const dir = useSelector(selectProjectDir);
	const cases = useSelector(selectCases);
	const dispatch = useDispatch();

	const handleError = (err: Error) => {
		dispatch(showAlert({ color: 'red', message: `Error: ${err.message}` }));
	};

	const createCase = async () => {
		dispatch(showAlert({ color: 'green', message: 'Create case functionality not implemented yet' }));
	};

	const openCase = async (file: CaseData) => {
		handleError(new Error(`Opening: ${file.name}, not yet implemented`));
	}

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
					{/* Button for opening a new case */}
					<li>
						<Button buttonText="+" onClick={createCase} />
					</li>
				</ul>
			</div>
			<style>{`
				.case-list {
					display: flex;
					flex-direction: column;
					width: 100%;
					justify-content: center;
					align-items: center;
					gap: 0.5rem;
					padding: 10px;
					margin: 0;
					list-style: none;
				}
			`}</style>
		</>
	);
}