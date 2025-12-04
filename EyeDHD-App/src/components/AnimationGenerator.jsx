import { useState, useEffect } from 'react';
import LoadingOverlay from './LoadingOverlay';
import AlertWindow from './AlertWindow';
import AnimationContainer from './AnimationContainer';
import ExportManager from './ExportManager';
import Button from './Button';

export default function AnimationGenerator() {
  const [csvData, setCsvData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [files, setFiles] = useState(null);

  const styles = {
    container: {
      textAlign: ' center',
      backgroundColor: '#fff',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      width: '60%',
      margin: '2rem auto',
      alignItems: 'center'
    },
    buttonContainer: {
      display: 'flex',
      flexDirection: 'row',
      gap: '10px',
      justifyContent: 'center',
      marginTop: '1rem',
    },
    select: {
      fontSize: '1rem',
      color: '#000',
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '1rem',
      backgroundColor: '#f9f9f9',
      marginTop: '1rem',
      width: 'fit-content',
    },
    buttonInline: {
      display: 'inline-block',
    }
  };
 

  // gets the list of cleaned files
  const getFilesList = async () => {
    setIsLoading(true);

    const files = await electron.csv.getFileList().catch(handleError);
    if (error) return;

    const cleaned = files
      .filter((metadata) => metadata.completed)
      .map((metadata) => metadata.name);

    setFiles(cleaned);

    setIsLoading(false);
  };

  const loadMoreRows = async (name = null) => {
    const filename = name ? name : fileName;
    if (!filename) {
      sendError('No file loaded');
      return;
    }

    // Request 200 more rows from the backend
    const rows = await electron.csv.getBuffer(filename).catch(handleError);
    if (error) return;

    if (rows.length === 0) {
      setCsvData(null);
      setIsPlaying(false);
      sendAlert(`End of "${filename}" reached!`);
    }

    setCsvData(rows);
  };

  const sendAlert = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
      setAlertMessage('');
    }, 4000);
  };

  const handleError = (err) => {
    sendError(err.message);
  };

  const sendError = (message) => {
    setError(message);
    setTimeout(() => {
      setError('');
    }, 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFileName('');

    const form = e.target;
    const data = new FormData(form);

    const selected_file = data.get('fileSelect');
    if (selected_file === 'none') return;

    await electron.csv.resetReadingProgress(selected_file).catch(handleError);

    setFileName(selected_file);
    await loadMoreRows(selected_file);
  };

  const handleReset = async (e) => {
    e.preventDefault();

    await electron.csv.resetReadingProgress(fileName).catch(handleError);

    setFileName('');
  };

  useEffect(() => {
    getFilesList();
  }, []);

  return (
    <div className="animation-generator-container" style={styles.container}>
      {/*Used for when things take awhile to load*/}
      <LoadingOverlay isLoading={isLoading} />
      {/*Conditionally render an upload message*/}
      {files && (
        <form method="post" onSubmit={handleSubmit} onReset={handleReset}>
          <label htmlFor="file-select">
            Please select a file to generate an animation.
          </label>
          <div style={styles.buttonContainer}>
            <select name="fileSelect" defaultValue="none" style={styles.select}>
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
            <Button type="submit" onClick={() => {}} className="btn" buttonText="Generate" style={styles.buttonInline}/>
            <Button type="reset" onClick={() => {}} className="btn" buttonText="Reset" style={styles.buttonInline}/>
          </div>
        </form>
      )}
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
      {/*Conditionally render the AnimationContainer*/}
      {fileName && (
        <>
          <AnimationContainer
            csvData={csvData}
            loadMoreRows={loadMoreRows}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
          />
          
          {/* Export functionality */}
          <ExportManager
            csvData={csvData}
            fileName={fileName}
            onExportComplete={(result) => {
              if (result.success) {
                sendAlert(`Animation exported successfully! ${result.frameCount} frames exported.`);
              }
            }}
          />
        </>
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
    </div>
  );
}
