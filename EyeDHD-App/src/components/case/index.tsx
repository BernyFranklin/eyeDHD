import { type Metadata } from '../../types';

type Props = {
	metadata: Metadata
};

export default function Case(props: Props) {

	const openCase = async () => {

	};

	return (
		<>
			<div className='case-item' onClick={openCase}>
				<span className='case-name'>{props.metadata.name}</span>
				<div className='case-options'>...</div>
			</div>
			<style>
			{`
				.case-item {
					display: flex;
					padding: 10px;
					width: 200px;
					border: 1px solid #ccc;
					border-radius: 5px;
					margin-bottom: 10px;
					cursor: pointer;
					transition: background-color 0.2s ease;
				}

				.case-name {
					justify-self: left;
					padding-left: 5px;
				}

				.case-options {
					justify-self: right;
					padding-right: 5px;
				}
			`}
			</style>

		</>
	);
}