import { useMemo } from 'react';
import { type Metadata } from '../../types';

type Props = {
	file: Metadata,
	onClick: (file: Metadata) => void
};

export default function Case(props: Props) {
	const name = useMemo(() => {
		const nameWithoutExtension = props.file.name.replace(/\.[^/.]+$/, '');
		return nameWithoutExtension;
	}, [props.file]);

	return (
		<>
			<div className='case-item' onClick={() => props.onClick(props.file)}>
				<span className='case-name'>{name}</span>
				<div className='case-options'>...</div>
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
					cursor: pointer;
					transition: background-color 0.2s ease;
				}

				.case-name {
					padding-left: 5px;
				}

				.case-options {
					margin-left: auto;
					padding-right: 5px;
				}
			`}
			</style>

		</>
	);
}