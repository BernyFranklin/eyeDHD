import React, { useMemo } from 'react';

import { type CSVData } from '../../data/types';

type Props = {
	fileName: string;
	csvData: CSVData[];
};

export default function PreviewCsvFile({ fileName, csvData }: Props) {
	const displayText = useMemo(() => {
		if (csvData == null) return 'File read fully.';

		// If it's an array, show a readable preview (first 100 rows max)
		if (Array.isArray(csvData)) {
			if (csvData.length === 0) return 'Data not processed yet.';
			const rows = csvData;

			// If rows are objects (typical Papa.parse header:true), pretty-print JSON
			if (typeof rows[0] === 'object' && rows[0] !== null && !Array.isArray(rows[0])) {
				return JSON.stringify(rows, null, 2);
			}

			// Otherwise, join primitive values/arrays into lines
			return rows
				.map((row) => (typeof row === 'object' ? JSON.stringify(row) : String(row)))
				.join('\n');
		}

		// For single objects, pretty-print JSON; else coerce to string
		return typeof csvData === 'object'
			? JSON.stringify(csvData, null, 2)
			: String(csvData);
	}, [csvData]);

	return (
		<div className="preview-csv-file-container">
			<p className="preview-title">Preview of {fileName}</p>
			<textarea readOnly className="csv-textarea" value={displayText} />
			<style>{`
				.preview-csv-file-container {
					width: 100%;
				}

				.preview-title {
					margin: 1.5rem 0 -1rem 0;
				}

				.csv-textarea {
					width: 50%;
					height: 150px;
					margin-top: 20px;
					font-family: monospace;
					font-size: 14px;
					padding: 10px;
					border: 1px solid #ccc;
					border-radius: 4px;
					box-sizing: border-box;
					color: #000;
					background-color: #fff;
				}
			`}</style>
		</div>
	);
}
