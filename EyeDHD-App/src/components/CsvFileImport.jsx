import { useState } from 'react'

export function CsvFileImport({ onFileLoad }) {
    const [fileName, setFileName] = useState(""); 
    const [error, setError] = useState("");
    const handleFileChange = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            setError("Please select a valid CSV file.");
            setFileName("");
            return;
        }

        setError("");
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const csvContent = event.target.result;
            onFileLoad?.(csvContent);
        };
        reader.readAsText(file);
    };

    return (
        <div className="csv-import-container">
            <label htmlFor="csvUpload" className="csv-upload-label">
                Select a CSV File
            </label>
            <input
                type="file"
                id="csvUpload"
                accept=".csv"
                onChange={handleFileChange}
                className="csv-upload-input"
            />

            {fileName && <p className="file-info">{fileName} loaded</p>}
            {error && <p className="error-info">{error}</p>}
        </div>
    );
}

export default CsvFileImport;
