export default function PreviewCsvFile({ fileName, csvData }) {
    return (
        <div className="preview-csv-file-container">
            <p className="preview-title">Preview of {fileName}</p>
            <textarea className="csv-textarea" value={csvData.slice(0, 500)} readOnly></textarea>
        </div>
    );
}