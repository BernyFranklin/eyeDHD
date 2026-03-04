import React from 'react';

import { AlertControls } from '@src/components/AlertWindow';

import { type CaseData } from '@src/data/types';


type Props = {
	file: CaseData,
	onClick: (file: CaseData) => void
};

/**
 * Component for displaying a single case in the case list, shows case name and
 * an options button. Clicking on the case name calls onClick
 * callback with the case data so the case list knows which item to select.
 */
export default function Case(props: Props) {
	return (
		<>
			<div className='case-item'>
				<a
					onClick={(event) => {
						event.preventDefault();
						props.onClick(props.file);
					}}
				>
					{props.file.name}
				</a>
				<div
					className='case-options'
					onClick={() => AlertControls.show('Not implemented', 'red')}
				>
					...
				</div>
			</div>
			<style>{`
				.case-item {
					background: #F0F0F0;
					color: #A0A0A0;
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 10px;
					width: 200px;
					border: 1px solid #ccc;
					border-radius: var(--action-radius);
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
					color: black;
					margin-left: auto;
					padding-right: 5px;
					cursor: pointer;
				}
			`}</style>
		</>
	);
}