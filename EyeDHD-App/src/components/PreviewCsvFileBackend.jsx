import { useMemo } from "react";

export default function PreviewCsvFile({ fileName, csvData }) {
    const displayText = useMemo(() => {
        if (csvData === null) return "File read fully."
        if (csvData.length === 0) return "No data to display.";

        return csvData.map(row => `Frame: ${row.Frame},` ?? ' ').join("\t");
    })

    return (
        <div className="preview-csv-file-container">
            <p className="preview-title">Preview of {fileName}</p>
            <textarea
                readOnly
                className="csv-textarea"
                value={displayText}
            />
        </div>
    );
}