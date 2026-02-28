import React from 'react';

import CaseItem from "./CaseItem";
import Button from '../Button';
import LoadingOverlay from '../LoadingOverlay';
import AlertWindow, { useAlert } from '../AlertWindow';

import { type Error, type CaseData } from '../../types';
import { useSelector } from '../../store/hooks';
import { selectCases, selectProjectDir } from '../../store/features/user';

type Props = {
	loading: boolean;
};

export default function CaseList(props: Props) {
	const dir = useSelector(selectProjectDir);
	const cases = useSelector(selectCases);
	const alert = useAlert();

	const createCase = async () => {
		alert.show('green', 'Create case functionality not implemented yet');
	};

	const openCase = async (file: CaseData) => {
		handleError(new Error(`Opening: ${file.name}, not yet implemented`));
	}

	const handleError = (err: Error) => {
		alert.show('red', `Error: ${err.message}`);
	};

	if (!dir || props.loading) {
		return null;
	}

	return (
		<>
			<AlertWindow alert={alert} />
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
							<CaseItem file={file} onClick={openCase} alert={alert} />
						</li>
					})}
					{/* Button for opening a new case */}
					<li>
						<Button buttonText="+" onClick={createCase} />
					</li>
				</ul>
			</div>
			<style>
				{`
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
				`}
			</style>
		</>
	);
}