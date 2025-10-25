import { useState } from 'react'
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
        const file = await electron.csv.openFile(200).catch(err => {
            sendError(err.message);
        });
        if (error) return;
        if (!file) return;

        setFileName(file);
        sendAlert(`File "${file}" uploaded successfully!`);

        // Request 200 rows from the backend
        const first200Rows = await electron.csv.getBuffer(file).catch(err => {
            setError(err.message);
        });
        if (error) return;

        setCsvData(first200Rows);
    };

    const loadMoreRows = async () => {
        if (!fileName) {
            sendError("No file loaded");
            return;
        }

        // Request 200 more rows from the backend
        const moreRows = await electron.csv.getBuffer(fileName).catch(err => {
            sendError(err.message);
        });
        if (error) return;

        setCsvData(moreRows);

        if (moreRows === null) {
            sendAlert(`End of "${fileName}" reached!`);
        } else {
            sendAlert(`Loaded 200 rows from "${fileName}" successfully!`);
        }
    }

    const sendAlert = (message) => {
        setAlertMessage(message);
        setShowAlert(true);
        setTimeout(() => {
            setShowAlert(false);
        }, 4000);
    }

    const sendError = (message) => {
        setError(message);
        setTimeout(() => {
            setError("");
        }, 4000);
    }

    return (
        <div className="csv-import-container">
            <button id="csvUpload" onClick={openFile}>
                Select a CSV File
            </button>
            <button id="loadMore" onClick={loadMoreRows}>
                Load More Rows
            </button>

            {error && <AlertWindow message={error} classColor=" red" onClose={() => {setError(""); setShowAlert(false)}} />}
            {fileName && <PreviewCsvFile fileName={fileName} csvData={csvData} />}
            {showAlert && <AlertWindow message={alertMessage} classColor=" green" onClose={() => setShowAlert(false)} />}
        </div>
    );
}

export default CsvFileImport;
