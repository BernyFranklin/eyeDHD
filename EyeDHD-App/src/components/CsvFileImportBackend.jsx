import { useEffect, useState } from 'react'
import PreviewCsvFile from './PreviewCsvFileBackend';
import AlertWindow from './AlertWindow';
import Button from './Button';
import LoadingOverlay from './LoadingOverlay';
import AnimationWindow from './AnimationWindow'

export function CsvFileImport() {
    // Store data and handle the file load
    const [csvData, setCsvData] = useState([]);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [alertMessage, setAlertMessage] = useState("");
    const [showAlert, setShowAlert] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const openFile = async () => {
        // Request backend to open a file selector, wait for filename
        const file = await electron.csv.openFile(200).catch(handleError);
        if (error || !file) return;

        setFileName(file);
        setIsLoading(true);

        // Request 200 rows from the backend
        const rows = await electron.csv.getBuffer(file).catch(handleError);
        if (error) return;

        setCsvData(rows);
        setIsLoading(false);
    };


    // Imports CSV data into database
    const dbImport = async () => {
        try {
            const result = await window.electron.db.importCsv(); // hard-coded CSV path
            setFileName(result);
            const rows = await window.electron.db.selectAll();   // read back
            console.log(rows);
            setCsvData(rows);
        } catch (err) {
            sendError(err.message);
        }
    };

    const loadMoreRows = async () => {
        if (!fileName) {
            sendError("No file loaded");
            return;
        }

        // Request 200 more rows from the backend
        const rows = await electron.csv.getBuffer(fileName).catch(handleError);
        if (error) return;

        setCsvData(rows);

        if (rows === null) {
            sendAlert(`End of "${fileName}" reached!`);
        }
    }

    const sendAlert = (message) => {
        setAlertMessage(message);
        setShowAlert(true);
        setTimeout(() => {
            setShowAlert(false);
            setAlertMessage("");
        }, 40000);
    }

    const handleError = (err) => {
        sendError(err.message);
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
                electron.csv.closeFile(previous).catch(handleError);
            }
        }
    }, [fileName])

    return (
        <div className="csv-import-container">
            <LoadingOverlay isLoading={isLoading} />
            <Button onClick={openFile} className="btn" buttonText="Select a CSV File" />
            <Button onClick={dbImport} className="btn" buttonText="SQLite Import" />

            {error && <AlertWindow message={error} classColor=" red" onClose={() => {setError(""); setShowAlert(false)}} />}
            {fileName && <PreviewCsvFile fileName={fileName} csvData={csvData} />}
            <AnimationContainer fileName={fileName} csvData={csvData} loadMoreRows={loadMoreRows} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
            {showAlert && <AlertWindow message={alertMessage} classColor=" green" onClose={() => setShowAlert(false)} />}
        </div>
    );
}

export default CsvFileImport;

function AnimationContainer({ fileName, csvData, loadMoreRows, isPlaying, setIsPlaying }) {
    if(!fileName) {
        return (
            <div className="animation-window-container">
                <p>Load a file to view animation!</p>
            </div>
        );
    }

    return (
        <div className="animation-window-container">
            <AnimationWindow csvData={csvData} loadMoreRows={loadMoreRows} isPlaying={isPlaying} />
            <div className="animation-controls">
                <Button onClick={() => setIsPlaying(!isPlaying)} className="btn" buttonText={isPlaying ? "Pause Animation" : "Play Animation"} />
            </div>
        </div>
    )
}