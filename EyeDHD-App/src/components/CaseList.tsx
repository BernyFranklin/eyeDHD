import React, {
    useEffect,
	useState
} from 'react';

import Case from "./case/Index";

import RemoteStream from '../data/RemoteStream';
import { type Metadata } from '../types';

export default function CaseList() {
	const [cases, setCases] = useState<Metadata[]>([]);

	const fetchCases = async () => {
		const stream = await RemoteStream.create('Metadata', {});
		try {
			const cases = await stream.collect<Metadata>();
			setCases(cases);
		} catch (err) {
			console.error('Error streaming metadata:', err);
		}
	};

	useEffect(() => {
		setCases([
			// Add mock metadata for demo prototyping purposes
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
	}, []);

	return (
		<div>
			Open Cases:
			<ul>
				{cases.map(metadata => {
					return <Case metadata={metadata} />
				})}
			</ul>
		</div>
	);
}