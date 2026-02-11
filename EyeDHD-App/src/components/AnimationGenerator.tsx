import React, { useState, useEffect } from 'react';
import LoadingOverlay from './LoadingOverlay';
import AlertWindow from './AlertWindow';
import AnimationContainer from './AnimationContainer';
import ExportManager from './ExportManager';
import Button from './Button';

import { type Metadata } from '../../electron/db/tables/metadata';
import { type CSVData } from '../../electron/db/tables/csv';
import RemoteStream from '../data/RemoteStream';

export default function AnimationGenerator() {
  const [csvData, setCsvData] = useState<RemoteStream | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  const [files, setFiles] = useState<string[]>([]);

  const styles = {
    container: {
      textAlign: ' center',
      backgroundColor: '#fff',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      margin: '2rem auto',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: '2rem'
    },
    buttonContainer: {
      display: 'flex',
      flexDirection: 'row',
      gap: '10px',
      justifyContent: 'center',
      marginTop: '1rem'
    },
    buttonInline: {
      display: 'inline-block'
    },
    singlePane: {
      width: '40%',
      padding: '1rem',
      border: '1px solid #ccc',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  } as any;

  styles.leftPane = {
    ...styles.singlePane,
    backgroundColor: '#f8f9fa'
  };

  styles.rightPane = {
    ...styles.singlePane,
    backgroundColor: '#f1f3f4'
  };

  // gets the list of cleaned files
  const getFilesList = async () => {
    setIsLoading(true);

    try {
      const files = await window.electron.csv.getFileList();
      if (error) return;

      const cleaned = files
        .filter((metadata: Metadata) => metadata.completed)
        .map((metadata: Metadata) => metadata.name);

      setFiles(cleaned);
    } catch (err) {
      handleError(err);
    }

    setIsLoading(false);
  };

  const loadMoreRows = async () => {
    if (!fileName) {
      sendError('No file loaded');
      return;
    }

    const file = await window.electron.csv.getMetadata(fileName);
    setCsvData(await RemoteStream.create("CSVData", { file }));
  };

  const sendAlert = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
      setAlertMessage('');
    }, 4000);
  };

  const handleError = (err: any) => {
    sendError(err.message);
  };

  const sendError = (message: string) => {
    setError(message);
    setTimeout(() => {
      setError('');
    }, 4000);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setFileName('');
    setIsHidden(false);

    const form: HTMLFormElement | undefined = e.target as HTMLFormElement;
    const data = new FormData(form);

    const selected_file = data.get('fileSelect');
    if (selected_file === 'none') return;

    try {
      setFileName(selected_file as string);
      await loadMoreRows();
    } catch (err) {
      handleError(err);
    }
  };

  const handleReset = async (e: Event) => {
    e.preventDefault();
    setIsHidden(true);

    // Set form select back to 'none'
    const select: HTMLSelectElement | null = document.querySelector(
      'select[name="fileSelect"]'
    );
    if (select) select.value = 'none';

    // Reset reading progress if we have a filename
    if (fileName) {
      csvData?.cancel();
    }

    // Reset all state
    setFileName('');
    setCsvData(null);
    setIsPlaying(false);
  };

  useEffect(() => {
    getFilesList();
  }, []);

  return (
    <>
      {/*Conditionally render an error message*/}
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
      {/*Conditionally render the alert message*/}
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
      <div className="animation-generator-container" style={styles.container}>
        {/*Used for when things take awhile to load*/}
        <LoadingOverlay isLoading={isLoading} />
        <div
          className="left-pane"
          style={isHidden ? { ...styles.leftPane, width: 'auto' } : styles.leftPane}
        >
          <h3>Generate Animation</h3>
          {files && (
            <form
              method="post"
              onSubmit={handleSubmit as any}
              onReset={handleReset as any}
            >
              <label htmlFor="file-select">
                Please select a file to generate an animation.
              </label>
              <div style={styles.buttonContainer}>
                <select name="fileSelect" defaultValue="none">
                  <option disabled value="none">
                    none
                  </option>
                  {files.map((file, index) => {
                    return (
                      <option key={index} value={file}>
                        {file}
                      </option>
                    );
                  })}
                </select>
                <Button
                  type="submit"
                  onClick={undefined}
                  className="btn"
                  buttonText="Generate"
                  style={styles.buttonInline as React.CSSProperties}
                />
                <Button
                  type="reset"
                  onClick={handleReset}
                  className="btn"
                  buttonText="Reset"
                  style={styles.buttonInline as React.CSSProperties}
                />
              </div>
            </form>
          )}
          {/*Conditionally render the AnimationContainer*/}
          {fileName !== '' && (
            <AnimationContainer
              csvData={csvData}
              loadMoreRows={loadMoreRows}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
            />
          )}
        </div>
        <div
          className="right-pane"
          style={isHidden ? { display: 'none' } : styles.rightPane}
        >
          {/* Export functionality */}
          {fileName !== '' && (
            <ExportManager
              csvData={csvData}
              fileName={fileName}
              onExportComplete={(result: any) => {
                if (result.success) {
                  sendAlert(
                    `Animation exported successfully! ${result.frameCount} frames exported.`
                  );
                }
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
