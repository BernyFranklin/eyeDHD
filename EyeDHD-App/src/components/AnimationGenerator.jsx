import { useState, useEffect } from 'react';
import LoadingOverlay from './LoadingOverlay';
import AlertWindow from './AlertWindow';
import Button from './Button';
import AnimationContainer from './AnimationContainer';

export default function AnimationGenerator() {
    const [csvData, setCsvData] = useState([]);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [alertMessage, setAlertMessage] = useState("");
    const [showAlert, setShowAlert] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const containerStyles = {
        textAlign: " center",
        backgroundColor: "#fff",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        width: "60%",
        margin: "2rem auto",
        alignItems: "center"
    }

    // Handler for opening a file
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
    };

    const sendAlert = (message) => {
            setAlertMessage(message);
            setShowAlert(true);
            setTimeout(() => {
                setShowAlert(false);
                setAlertMessage("");
            }, 40000);
    };
    
    const handleError = (err) => {
        sendError(err.message);
    };
    
    const sendError = (message) => {
        setError(message);
        setTimeout(() => {
            setError("");
        }, 4000);
    };
    
    // Close the previous file when a new file is opened
    useEffect(() => {
        const previous = fileName;

        return () => {
            if (previous) {
                electron.csv.closeFile(previous).catch(handleError);
            }
        }
    }, [fileName]);

    return (
        <div className="animation-generator-container" style={containerStyles}>
            {/*Used for when things take awhile to load*/}
            <LoadingOverlay isLoading={isLoading} />
            {/*Conditionally render an upload message*/}
            {!fileName && <p>Please select a file to generate an animation.</p>}
            <Button onClick={openFile} className="btn" buttonText="Select a Clean CSV File" />
            {/*Conditionally render an error message*/}
            {error && <AlertWindow message={error} classColor=" red" onClose={() => {setError(""); setShowAlert(false)}} />}
            {/*Conditionally render the AnimationContainer*/}
            {fileName &&
            <AnimationContainer csvData={csvData} loadMoreRows={loadMoreRows} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />}
            {/*Conditionally render the alert message*/}
            {showAlert && <AlertWindow message={alertMessage} classColor=" green" onClose={() => setShowAlert(false)} />}
        </div>
    );
}