export default function PreviewCsvFile({ fileName, csvData }) {
    return (
        <div className="preview-csv-file-container">
            <p className="preview-title">Preview of {fileName}</p>
            <textarea className="csv-textarea" value={JSON.stringify(csvData.slice(0, 1), null, 2)} readOnly></textarea>
        </div>
    );
}