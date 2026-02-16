import React, { useState } from 'react';
import PreviewCsvFile from './PreviewCsvFile';
import AlertWindow from './AlertWindow';
import Button from './Button';
import LoadingOverlay from './LoadingOverlay';
import { type Error, type CSVData, Metadata, Progress } from '../types';
import RemoteStream from '../data/RemoteStream';

type Props = {
  buttonsDisabled: boolean;
  setButtonsDisabled: (disabled: boolean) => void;
};

export function CsvFileImport({ buttonsDisabled, setButtonsDisabled }: Props) {
  // Store data and handle the file load
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [file, setFile] = useState<Metadata | null>();
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Data cleaning state
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleaningProgress, setCleaningProgress] = useState<any>(null);
  const [cleaningStats, setCleaningStats] = useState<any>(null);
  const [showCleaningResults, setShowCleaningResults] = useState(false);

  const styles = {
    buttonContainer: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: '20px'
    },
    cleaningContainer: {
      margin: '20px 0',
      padding: '15px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      border: '1px solid #ddd'
    },
    progressBar: {
      width: '400px',
      height: '20px',
      backgroundColor: '#e0e0e0',
      borderRadius: '10px',
      overflow: 'hidden',
      margin: '0 auto 10px auto'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#4caf50',
      transition: 'width 0.3s ease'
    },
    statsGrid: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: '10px',
      marginTop: '10px'
    },
    statItem: {
      padding: '8px 12px',
      backgroundColor: 'white',
      borderRadius: '4px',
      border: '1px solid #ccc'
    }
  };

  const openFile = async () => {
    if (buttonsDisabled) return;
    setIsLoading(true);

    setFile(null);
    setCsvData([]);
    setCleaningProgress({
    	progressPercent: 0,
 			isComplete: false,
 			isReading: false,
			rowsProcessed: 0
    });
    setCleaningStats(null);
    setShowCleaningResults(false);
    setIsCleaning(false);

    // Request backend to open a file selector, wait for filename
    try {
	    const file = await window.electron.csv.openFile();
	    if (!file) {
	      setIsLoading(false);
	      return;
	    }
	    setFile(file);

      if (file.completed) {
        setCleaningProgress({ ...cleaningProgress, isComplete: true });
        // Get a stream, load 10 rows and cancel it
        const stream = await RemoteStream.create("CSVData", { file });
        const rows: CSVData[] = [];
        for await (const row of stream) {
        	if (rows.length >= 10) {
        		break;
        	}
  				rows.push(row as CSVData);
				}

        setCleaningStats({ ...cleaningStats, stats: { totalRows: file.rows } });
        setCsvData(rows);
      }
    } catch (err) {
      handleError(err);
    }

    setIsLoading(false);
  };

  // Data cleaning functionality
  const cleanData = async () => {
    if (buttonsDisabled) return;
    if (!file) {
      sendError('No file selected for cleaning');
      return;
    }

    try {
      setButtonsDisabled(true);
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
      const stream = (await RemoteStream.create("Cleaning", { file }));
      const previewCSV: CSVData[] = [];
      for await (const row of stream) {
       	if (previewCSV.length < 10) {
	       	previewCSV.push(row as CSVData);
        }
      	setCleaningProgress({
       		...cleaningProgress,
         	rowsProcessed: stream.progress.rows,
          progressPercent: stream.progress.rows / 275_000 * 100,
          isComplete: stream.progress.done,
          isReading: stream.progress.done
       	})
      }

      setCsvData(previewCSV);
     	setCleaningProgress({
    		...cleaningProgress,
	      isComplete: stream.progress.done,
	      isReading: !stream.progress.done
     	})
      setIsCleaning(false);
      setButtonsDisabled(false);
      sendAlert('Data cleaning complete!');
    } catch (err) {
      setButtonsDisabled(false);
      setIsCleaning(false);
      sendError(err.message || 'Failed to start data cleaning');
    }
  };

  // Export cleaned CSV data to a new file
  const exportCleanedData = async () => {
    if (buttonsDisabled) return;
    if (!file) {
      sendError('No file selected for export');
      return;
    }

    // Check if cleaning is complete
    if (!file.completed) {
      sendError('No cleaned data available. Please clean the data first.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await window.electron.csv.exportData(file);

      // Set up this work just like the cleaning stream

      if (result.success) {
        sendAlert(
          `Successfully exported ${result.stats.totalExported} rows to ${result.stats.filePath.split('\\').pop()}`
        );
      } else {
        sendError(result.message || 'Export failed');
      }
    } catch (err) {
      sendError(err.message || 'Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  const clearFile = async () => {
    if (buttonsDisabled) return;
    setCsvData([]);
    setCleaningProgress({
      progressPercent: 0,
      isComplete: false,
      isReading: false,
      rowsProcessed: 0
    });
    setCleaningStats(null);
    setShowCleaningResults(false);
    setIsCleaning(false);

    if (file) {
      await window.electron.csv.resetCleaningProgress(file).catch(handleError);
    }
    setFile(null);
  };

  const sendAlert = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
      setAlertMessage('');
    }, 4000);
  };

  const handleError = (err: Error) => {
    sendError(err.message);
  };

  const sendError = (message: string) => {
    setError(message);
    setTimeout(() => {
      setError('');
    }, 4000);
  };

  return (
    <div className="csv-import-container">
      <LoadingOverlay isLoading={isLoading} />
      <Button
        onClick={openFile}
        className={`btn ${buttonsDisabled ? 'disabled' : ''}`}
        disabled={buttonsDisabled}
        buttonText="Select a CSV File"
      />

      {error && (
        <AlertWindow
          message={error}
          classColor=" red"
          onClose={() => {
            setError('');
            setShowAlert(false);
          }}
        />
      )}
      {file && (
        <>
          <PreviewCsvFile fileName={file.name} csvData={csvData} />

          {/* Data Cleaning Section */}
          {showCleaningResults && cleaningProgress && (
            <div style={styles.cleaningContainer}>
              <h3>Data Cleaning {isCleaning ? 'In Progress...' : 'Results'}</h3>
              {/* Cleaning progress  */}
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
                  <p>
                    Status:{' '}
                    {cleaningProgress.isComplete
                      ? 'Complete'
                      : cleaningProgress.isReading
                        ? 'Processing...'
                        : 'Ready'}
                  </p>
                </div>
              )}
              {/* Cleaning stats */}
              {/* cleaningStats && cleaningStats.stats && (
                <div style={styles.statsGrid as React.CSSProperties}>
                  <div style={styles.statItem}>
                    <strong>Total Rows:</strong>{' '}
                    {(cleaningStats.stats.totalRows || 0).toLocaleString()}
                  </div>
                  <div style={styles.statItem}>
                    <strong>Error Rows:</strong>{' '}
                    {(cleaningStats.stats.errorRows || 0).toLocaleString()}
                  </div>
                </div>
              )*/}
            </div>
          )}
          {/* File action buttons */}
          <div style={styles.buttonContainer as React.CSSProperties}>
            {!cleaningProgress?.isComplete && (
              <Button
                onClick={isCleaning ? undefined : cleanData}
                className={`btn${isCleaning ? ' disabled' : ''}`}
                buttonText={isCleaning ? 'Cleaning...' : 'Clean Data'}
              />
            )}
            <Button
              onClick={exportCleanedData}
              className={`btn${buttonsDisabled || !cleaningProgress?.isComplete ? ' disabled' : ''}`}
              buttonText="Export Clean Data"
              disabled={buttonsDisabled || !cleaningProgress?.isComplete}
            />
            <Button
              onClick={clearFile}
              className={`btn ${buttonsDisabled ? 'disabled' : ''}`}
              buttonText="Clear File"
              disabled={buttonsDisabled}
            />
          </div>
        </>
      )}
      {/* Alert window */}
      {showAlert && (
        <AlertWindow
          message={alertMessage}
          classColor=" green"
          onClose={() => {
            setShowAlert(false);
            setAlertMessage('');
          }}
        />
      )}
    </div>
  );
}

export default CsvFileImport;
