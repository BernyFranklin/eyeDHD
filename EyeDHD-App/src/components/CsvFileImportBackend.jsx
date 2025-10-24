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
        setError("");

        const file = await electron.csv.openFile(200)
            .catch(err => {
                setError(err.message);
            });
        if (error) return;

        if (!file) return;
        setFileName(file);

        setAlertMessage(`File "${file}" uploaded successfully!`);
        setShowAlert(true);
        setTimeout(() => {
            setShowAlert(false);
        }, 4000);

        const first200Rows = await electron.csv.getBuffer(file)
            .catch(err => {
                setError(err.message);
            });
        if (error) return;

        setCsvData(first200Rows);
    };

    const loadMoreRows = async () => {
        setError("");
        if (!fileName) {
            setError("No file loaded");
            return;
        }

        const moreRows = await electron.csv.getBuffer(fileName)
            .catch(err => {
                setError(err.message);
            });
        if (error) return;

        setCsvData(moreRows);

        if (moreRows === null) {
            setAlertMessage(`End of "${fileName}" reached!`);
        } else {
            setAlertMessage(`Loaded 200 rows from "${fileName}" successfully!`);
        }
        setShowAlert(true);
        setTimeout(() => {
            setShowAlert(false);
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