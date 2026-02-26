import { useMemo } from 'react';

import { type Metadata } from '../../types';
import { AlertContext } from '../AlertWindow';

type Props = {
	file: Metadata,
	onClick: (file: Metadata) => void,
	alert: AlertContext
};

export default function Case(props: Props) {
	const name = useMemo(() => {
		const nameWithoutExtension = props.file.name.replace(/\.[^/.]+$/, '');
		return nameWithoutExtension;
	}, [props.file]);

	return (
		<>
			<div className='case-item'>
				<a href='/case' onClick={() => props.onClick(props.file)}>{name}</a>
				<div className='case-options' onClick={() => props.alert.show('red', 'Not implemented')}>...</div>
			</div>
			<style>
			{`
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
			`}
			</style>

		</>
	);
}