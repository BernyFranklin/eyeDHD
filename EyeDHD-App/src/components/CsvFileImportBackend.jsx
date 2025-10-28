import { useEffect, useState } from 'react'
import PreviewCsvFile from './PreviewCsvFileBackend';
import AlertWindow from './AlertWindow';

export function CsvFileImport() {
    // Store data and handle the file load
    const [csvData, setCsvData] = useState([]);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [alertMessage, setAlertMessage] = useState("");
    const [showAlert, setShowAlert] = useState(false);

    const openFile = async () => {
        // Request backend to open a file selector, wait for filename
        const file = await electron.csv.openFile(Infinity).catch(err => {
            sendError(err.message);
        });
        if (error) return;
        if (!file) return;

        setFileName(file);
        sendAlert(`File "${file}" uploaded successfully!`);

        // Request 200 rows from the backend
        const rows = await electron.csv.getBuffer(file).catch(err => {
            sendError(err.message);
        });
        if (error) return;

        setCsvData(rows);
    };


    // Imports CSV data into database
    const dbImport = async () => {
        //
    };

    const sendAlert = (message) => {
        setAlertMessage(message);
        setShowAlert(true);
        setTimeout(() => {
            setShowAlert(false);
            setAlertMessage("");
        }, 4000);
    }

    const sendError = (message) => {
        setError(message);
        setTimeout(() => {
            setError("");
        }, 4000);
    }

    // Close the previous file when a new file is opened
    useEffect(() => {
		const previous = fileName;

        return () => {
            if (previous) {
                electron.csv.closeFile(previous).catch(err => {
                    sendError(err.message);
                });
            }
        }
    }, [fileName])

    return (
        <div className="csv-import-container">
            <button id="csvUpload" onClick={openFile}>
                Select a CSV File
            </button>
            <button id="dbCSVImport" onClick={dbImport}>
                SQLite Import
            </button>

            {error && <AlertWindow message={error} classColor=" red" onClose={() => {setError(""); setShowAlert(false)}} />}
            {fileName && <PreviewCsvFile fileName={fileName} csvData={csvData} />}
            {showAlert && <AlertWindow message={alertMessage} classColor=" green" onClose={() => setShowAlert(false)} />}
        </div>
    );
}

export default CsvFileImport;
