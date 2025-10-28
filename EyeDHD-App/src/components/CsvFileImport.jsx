import { useState } from 'react'
import PreviewCsvFile from './PreviewCsvFile';
import AlertWindow from './AlertWindow';
import FilePicker from './FilePicker';

export function CsvFileImport() {
    // Store data and handle the file load
    const [csvData, setCsvData] = useState("");
    const [fileName, setFileName] = useState(""); 
    const [error, setError] = useState("");
    const [showAlert, setShowAlert] = useState(false);

    const handleFileChangeCsv = (e) => {
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
            setCsvData(event.target.result);
            setShowAlert(true);
              
            setTimeout(() => {
                setShowAlert(false);
            }, 4000);
        };
        reader.readAsText(file);
    };
    
    return (
        <div className="csv-import-container">
            <label htmlFor="csvUpload" className="csv-upload-label">
                Select a CSV File
            </label>
            <FilePicker 
                type="file" 
                id="csvUpload" 
                accept=".csv" 
                onChange={handleFileChangeCsv} 
            />

            {error && <AlertWindow message={error} classColor=" red" onClose={() => setShowAlert(false)} />}
            {fileName && <PreviewCsvFile fileName={fileName} csvData={csvData} />}
            {showAlert && <AlertWindow message={`File "${fileName}" uploaded successfully!`} classColor=" green" onClose={() => setShowAlert(false)} />}
        </div>
    );
}

export default CsvFileImport;
