import { useState } from 'react'
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import PreviewCsvFile from './PreviewCsvFile';
import AlertWindow from './AlertWindow';
import FilePicker from './FilePicker';
import Button from './Button';
import LoadingOverlay from './LoadingOverlay';

export function CsvFileImport() {
    // Store data and handle the file load
    const [csvData, setCsvData] = useState("");
    const [fileName, setFileName] = useState(""); 
    const [error, setError] = useState("");
    const [showAlert, setShowAlert] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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
        setIsLoading(true); // Start loading

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                console.log("Parsed CSV Data: ", results.data);
                setCsvData(results.data);
                setIsLoading(false); // Stop loading
                setShowAlert(true);
                setTimeout(() => {
                    setShowAlert(false);
                }, 4000);
            },
            error: (error) => {
                console.error("Error parsing CSV:", error);
                setError("Error parsing CSV file.");
                setIsLoading(false); // Stop loading on error
            }
        });
    };

    const handleFileExport = () => {
        if (!csvData) {
            setError("No CSV data to export.");
            setShowAlert(true);
            setTimeout(() => {
                setShowAlert(false);
            }, 4000);
            setError("");
            return;
        }

        setIsLoading(true); // Start loading for export

        // Simulate processing time and create export
        setTimeout(() => {
            const cleanedData = csvData.map((row) => ({
                ...row,
                status: "Cleaned"
            }));

            const csv = Papa.unparse(cleanedData);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            saveAs(blob, `cleaned_${fileName}`);
            setIsLoading(false); // Stop loading after export
        }, 500); // Small delay to show loading state
    }
    
    return (
        <div className="csv-import-container">
            <LoadingOverlay isLoading={isLoading} />
            <label htmlFor="csvUpload" className="csv-upload-label">
                Select a CSV File
            </label>
            <FilePicker 
                type="file" 
                id="csvUpload" 
                accept=".csv" 
                onChange={handleFileChangeCsv} 
                disabled={isLoading}
            />
            {error && <AlertWindow message={error} classColor=" red" onClose={() => setShowAlert(false)} />}
            {fileName && <PreviewCsvFile fileName={fileName} csvData={csvData} />}
            {csvData && <Button onClick={handleFileExport} className="btn" buttonText="Export Cleaned CSV" disabled={isLoading} />}
            {showAlert && <AlertWindow message={`File "${fileName}" uploaded successfully!`} classColor=" green" onClose={() => setShowAlert(false)} />}
        </div>
    );
}

export default CsvFileImport;
