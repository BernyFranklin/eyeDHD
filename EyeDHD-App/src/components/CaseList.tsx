import React, {
    useEffect,
	useState
} from 'react';

import Case from "./case/Index";

import RemoteStream from '../data/RemoteStream';
import { Error, type Metadata } from '../types';
import Button from './Button';
import LoadingOverlay from './LoadingOverlay';

export default function CaseList() {
	const [cases, setCases] = useState<Metadata[]>([]);

	const [loading, setLoading] = useState(false);

	const fetchCases = async () => {
		const stream = await RemoteStream.create('Metadata', {});
		const cases = await stream.collect<Metadata>();
		setCases(cases);
	};

	const createCase = async () => {

	};

	const handleError = (err: Error) => {
		console.error(err);
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

		if (cases.length === 0) {
			fetchCases().catch(handleError).then(() => setLoading(false));
		}
	}, []);

	return (
		<div>
			{/* Lists all cases that have been opened and
				allows new cases to be opened
		  	*/}
			<ul>
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
	);
}