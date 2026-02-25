import React, {
    useEffect,
	useState
} from 'react';

import CaseItem from "./CaseItem";
import Button from '../Button';
import LoadingOverlay from '../LoadingOverlay';
import AlertWindow, { useAlert } from '../AlertWindow';

import RemoteStream from '../../data/RemoteStream';
import { type Error, type Metadata } from '../../types';

export default function CaseList() {
	const [cases, setCases] = useState<Metadata[]>([]);
	const [loading, setLoading] = useState(false);

	const alert = useAlert();

	const fetchCases = async () => {
		const stream = await RemoteStream.create('Metadata', {});
		const cases = await stream.collect<Metadata>();
		setCases(cases);
	};

	const createCase = async () => {
		alert.show('Create case functionality not implemented yet', 'green');
	};

	const openCase = async (file: Metadata) => {
		handleError(new Error(`Opening: ${file.name}, not yet implemented`));
		// Create an anchor element pointing to '/case' and click it

		const anchor = document.createElement('a');
		anchor.href = '/case';
		anchor.click();
	}

	const handleError = (err: Error) => {
		alert.show(`Error: ${err.message}`, 'red');
	};

	useEffect(() => {
		setLoading(true);

		setCases([
			{
				id: 0,
				name: 'ID.001.csv',
				path: '/path/to/ID.001.csv',
				header: 'header,stuff',
				completed: 0,
				rows: 0,
				created_at: Date.now().toString(),
				updated_at: Date.now().toString()
			},
			{
				id: 1,
				name: 'ID.002.csv',
				path: '/path/to/ID.002.csv',
				header: 'header,stuff',
				completed: 0,
				rows: 0,
				created_at: Date.now().toString(),
				updated_at: Date.now().toString()
			},
			{
				id: 2,
				name: 'ID.003.csv',
				path: '/path/to/ID.003.csv',
				header: 'header,stuff',
				completed: 0,
				rows: 0,
				created_at: Date.now().toString(),
				updated_at: Date.now().toString()
			}
		]);

		setLoading(false);
	}, []);

	return (
		<>
			<AlertWindow
				message={alert.message}
				onClose={alert.hide}
				isVisible={alert.isVisible}
				classColor={alert.classColor}
			/>
			<div>
				{/* Lists all cases that have been opened and
					allows new cases to be opened
			  	*/}
				<ul className='case-list'>
					<LoadingOverlay isLoading={loading} />

					{/* Map cases into clickable list items w/
						right side ... button for options like
						deleting the case
					*/}
					{cases.map(metadata => {
						return <li><CaseItem file={metadata} onClick={openCase} /></li>
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