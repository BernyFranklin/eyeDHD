import { useState, useEffect } from 'react';
import LoadingOverlay from './LoadingOverlay.js';
import AlertWindow from './AlertWindow.js';
import AnimationContainer from './AnimationContainer.js';
import ExportManager from './ExportManager.js';
import Button from './Button.js';

import { type Metadata } from '../../electron/data/tables/metadata';
import { type CSVData } from '../../electron/data/tables/csv.js';

const electron = (window as any).electron;

export default function AnimationGenerator() {
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  const [files, setFiles] = useState<Metadata[]>([]);

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

    const files = await electron.csv.getFileList().catch(handleError);
    if (error) return;

    const cleaned = files
      .filter((metadata: Metadata) => metadata.completed)
      .map((metadata: Metadata) => metadata.name);

    setFiles(cleaned);

    setIsLoading(false);
  };

  const loadMoreRows = async (name: string | null = null) => {
    const filename = name ? name : fileName;
    if (!filename) {
      sendError('No file loaded');
      return;
    }

    // Request 200 more rows from the backend
    const rows = await electron.csv.getBuffer(filename).catch(handleError);
    if (error) return;

    if (rows.length === 0) {
      setCsvData([]);
      setIsPlaying(false);
      sendAlert(`End of "${filename}" reached!`);
    }

    setCsvData(rows);
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

    await electron.csv.resetReadingProgress(selected_file).catch(handleError);

    setFileName(selected_file as string);
    await loadMoreRows(selected_file as string);
  };

  const handleReset = async (e: Event) => {
    e.preventDefault();
    setIsHidden(true);

    // Set form select back to 'none'
    const form = e.target;
    const select: HTMLSelectElement | null = document.querySelector(
      'select[name="fileSelect"]'
    );
    if (select) select.value = 'none';

    // Reset reading progress if we have a filename
    if (fileName) {
      await electron.csv.resetReadingProgress(fileName).catch(handleError);
    }

    // Reset all state
    setFileName('');
    setCsvData([]);
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
                      <option key={index} value={file.name}>
                        {file.name}
                      </option>
                    );
                  })}
                </select>
                <Button
                  type="submit"
                  onClick={() => {}}
                  className="btn"
                  buttonText="Generate"
                  style={styles.buttonInline as any}
                />
                <Button
                  type="reset"
                  onClick={handleReset}
                  className="btn"
                  buttonText="Reset"
                  style={styles.buttonInline as any}
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
