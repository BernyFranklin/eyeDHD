import { useEffect, useState } from 'react'
import PreviewCsvFile from './PreviewCsvFileBackend';
import AlertWindow from './AlertWindow';
import Button from './Button';
import LoadingOverlay from './LoadingOverlay';

export function CsvFileImport() {
    // Store data and handle the file load
    const [csvData, setCsvData] = useState([]);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [alertMessage, setAlertMessage] = useState("");
    const [showAlert, setShowAlert] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Data cleaning state
    const [isCleaning, setIsCleaning] = useState(false);
    const [cleaningProgress, setCleaningProgress] = useState(null);
    const [cleaningStats, setCleaningStats] = useState(null);
    const [showCleaningResults, setShowCleaningResults] = useState(false);
    const styles = {
        buttonContainer: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: '20px',
        },
        cleaningContainer: {
            margin: '20px 0',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            border: '1px solid #ddd',
        },
        progressBar: {
            width: '400px',
            height: '20px',
            backgroundColor: '#e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden',
            margin: '0 auto 10px auto',
        },
        progressFill: {
            height: '100%',
            backgroundColor: '#4caf50',
            transition: 'width 0.3s ease',
        },
        statsGrid: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: '10px',
            marginTop: '10px',
        },
        statItem: {
            padding: '8px 12px',
            backgroundColor: 'white',
            borderRadius: '4px',
            border: '1px solid #ccc',
        }
    };

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

    // Data cleaning functionality
    const cleanData = async () => {
        if (!fileName) {
            sendError("No file selected for cleaning");
            return;
        }

        try {
            setIsCleaning(true);
            setCleaningProgress({ 
                progressPercent: 0, 
                isComplete: false, 
                isReading: false, 
                rowsProcessed: 0 
            });
            setCleaningStats(null);
            setShowCleaningResults(true);

            // Start the cleaning process
            const result = await window.electron.csv.cleanData(fileName);
            
            // Get initial progress immediately
            try {
                const initialProgress = await window.electron.csv.getProgress(fileName);
                const initialStats = await window.electron.csv.getStats(fileName);
                setCleaningProgress(initialProgress);
                setCleaningStats(initialStats);
            } catch (err) {
                // Initial progress not available
            }
            
            // Set up progress monitoring
            const progressInterval = setInterval(async () => {
                try {
                    const progress = await window.electron.csv.getProgress(fileName);
                    const stats = await window.electron.csv.getStats(fileName);
                    
                    setCleaningProgress(progress);
                    setCleaningStats(stats);

                    // Stop monitoring when cleaning is complete
                    if (progress.isComplete) {
                        clearInterval(progressInterval);
                        setIsCleaning(false);
                        sendAlert(`Data cleaning completed! Quality Score: ${stats.stats?.qualityScore || 0}%`);
                        
                        // Refresh the data view with cleaned data
                        try {
                            const cleanedRows = await window.electron.csv.getBuffer(fileName);
                            if (cleanedRows) {
                                setCsvData(cleanedRows);
                            }
                        } catch (bufferError) {
                            // Buffer no longer available after completion
                        }
                    }
                } catch (err) {
                    // Cleaning monitoring completed or file closed
                    clearInterval(progressInterval);
                    setIsCleaning(false);
                    
                    // If we have stats, show completion message
                    if (cleaningStats) {
                        sendAlert(`Data cleaning completed! Quality Score: ${cleaningStats.stats?.qualityScore || 0}%`);
                    }
                }
            }, 50); // Check every 50ms for more responsive updates

        } catch (err) {
            setIsCleaning(false);
            sendError(err.message || 'Failed to start data cleaning');
        }
        
    };

    // Imports CSV data into database
    const dbImport = async () => {
        try {
            const result = await window.electron.db.importCsv(); // hard-coded CSV path
            setFileName(result);
            const rows = await window.electron.db.selectAll();   // read back
            setCsvData(rows);
        } catch (err) {
            sendError(err.message);
        }
    };

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

    const clearFile = () => {
        setFileName("");
        setCsvData([]);
        setCleaningProgress(null);
        setCleaningStats(null);
        setShowCleaningResults(false);
        setIsCleaning(false);
    };

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

            {error && <AlertWindow message={error} classColor=" red" onClose={() => {setError(""); setShowAlert(false)}} />}
            {fileName && 
                <>
                    <PreviewCsvFile fileName={fileName} csvData={csvData} />
                    
                    {/* Data Cleaning Section */}
                    {showCleaningResults && (
                        <div style={styles.cleaningContainer}>
                            <h3>Data Cleaning {isCleaning ? 'In Progress...' : 'Results'}</h3>
                            
                            {cleaningProgress && (
                                <div>
                                    <div style={styles.progressBar}>
                                        <div 
                                            style={{
                                                ...styles.progressFill,
                                                width: `${cleaningProgress.progressPercent}%`
                                            }}
                                        />
                                    </div>
                                    <p>{cleaningProgress.progressPercent.toFixed(1)}% Complete</p>
                                    <p>Status: {cleaningProgress.isComplete ? 'Complete' : cleaningProgress.isReading ? 'Processing...' : 'Ready'}</p>
                                </div>
                            )}
                            
                            {cleaningStats && cleaningStats.stats && (
                                <div style={styles.statsGrid}>
                                    <div style={styles.statItem}>
                                        <strong>Total Rows:</strong> {(cleaningStats.stats.totalRows || 0).toLocaleString()}
                                    </div>
                                    <div style={styles.statItem}>
                                        <strong>Error Rows:</strong> {(cleaningStats.stats.errorRows || 0).toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div style={styles.buttonContainer}>
                        <Button 
                            onClick={isCleaning ? () => {} : cleanData} 
                            className={`btn${isCleaning ? ' disabled' : ''}`} 
                            buttonText={isCleaning ? "Cleaning..." : "Clean Data"}
                        />
                        <Button onClick={dbImport} className="btn" buttonText="Import to Database" />
                        <Button onClick={clearFile} className="btn" buttonText="Clear File" />
                    </div>
                </>}
            {showAlert && <AlertWindow message={alertMessage} classColor=" green" onClose={() => setShowAlert(false)} />}
        </div>
    );
}

export default CsvFileImport;
