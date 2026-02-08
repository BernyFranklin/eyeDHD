import React, { useMemo } from 'react';
import { CSVData } from '../../electron/data/tables/csv';

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
      const rows = csvData.slice(0, 5);

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
    </div>
  );
}
