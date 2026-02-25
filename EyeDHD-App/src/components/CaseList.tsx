import React, {
    useEffect,
	useState
} from 'react';

import Case from "./case";

import RemoteStream from '../data/RemoteStream';
import { Error, type Metadata } from '../types';
import Button from './Button';
import LoadingOverlay from './LoadingOverlay';
import AlertWindow, { useAlert } from './AlertWindow';

export default function CaseList() {
	const [cases, setCases] = useState<Metadata[]>([]);

	const goodAlert = useAlert();
	const badAlert = useAlert();

	const [loading, setLoading] = useState(false);
	const [casesLoaded, setCasesLoaded] = useState(false);

	const fetchCases = async () => {
		const stream = await RemoteStream.create('Metadata', {});
		const cases = await stream.collect<Metadata>();
		setCases(cases);
	};

	const createCase = async () => {
		goodAlert.show('Create case functionality not implemented yet');
	};

	const handleError = (err: Error) => {
		badAlert.show(`Error: ${err.message}`);
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

		setLoading(true);
	}, []);

	return (
		<>
			<AlertWindow
				message={goodAlert.message}
				onClose={goodAlert.hide}
				isVisible={goodAlert.isVisible}
				classColor='green'
			/>
			<AlertWindow
				message={badAlert.message}
				onClose={badAlert.hide}
				isVisible={badAlert.isVisible}
				classColor='red'
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
						return <li><Case metadata={metadata} /></li>
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