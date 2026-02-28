import React, { useEffect, useState } from 'react';

import CaseItem from "./CaseItem";

import LoadingOverlay from '../LoadingOverlay';

import { type CaseData } from '../../types';
import { useSelector, useDispatch } from '../../store/hooks';
import { showAlert } from '../../store/features/global';
import { selectCases, selectProjectDir, setCases, setSelectedCase } from '../../store/features/user';

import RemoteStream from '../../data/RemoteStream';
import { useNavigate } from 'react-router';

type Props = {
	loading: boolean;
};

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
				dispatch(showAlert({
					color: 'red',
					message: `Error loading cases: ${err.message}`
				}));
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
					align-items: center;
					gap: 0.5rem;
					padding: 10px;
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