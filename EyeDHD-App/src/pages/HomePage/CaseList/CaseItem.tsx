import React from 'react';

import { type CaseData } from '../../../types';
import { useDispatch } from '../../../data/hooks';
import { showAlert } from '../../../data/features/global';

type Props = {
	file: CaseData,
	onClick: (file: CaseData) => void
};

/**
 * Component for displaying a single case in the case list, shows case name and
 * an options button (not implemented). Clicking on the case name calls onClick
 * callback with the case data so the case list knows which item to select.
 */
export default function Case(props: Props) {
	const dispatch = useDispatch();

	return (
		<>
			<div className='case-item'>
				<a
					href='/case'
					onClick={(event) => {
						event.preventDefault();
						props.onClick(props.file);
					}}
				>
					{props.file.name}
				</a>
				<div
					className='case-options'
					onClick={() => dispatch(showAlert({
						color: 'red',
						message: 'Not implemented'
					}))}
				>
					...
				</div>
			</div>
			<style>{`
				.case-item {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 10px;
					width: 200px;
					border: 1px solid #ccc;
					border-radius: 5px;
					margin-bottom: 10px;
					transition: background-color 0.2s ease;
				}

				.case-item a {
					cursor: pointer;
					text-decoration: none;
					color: #333;
					padding-left: 5px;
				}

				.case-options {
					margin-left: auto;
					padding-right: 5px;
					cursor: pointer;
				}
			`}</style>
		</>
	);
}