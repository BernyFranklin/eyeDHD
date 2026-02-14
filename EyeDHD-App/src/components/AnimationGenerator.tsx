import React, { useState, useEffect, ReactEventHandler } from 'react';
import LoadingOverlay from './LoadingOverlay';
import AlertWindow from './AlertWindow';
import Button from './Button';
import CanvasRecorder from './CanvasRecorder';

import { type Error, type CSVData, type Metadata } from '../types';
import RemoteStream from '../data/RemoteStream';

export default function AnimationGenerator() {
  const [csvStream, setCsvStream] = useState<RemoteStream | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [files, setFiles] = useState<string[]>([]);

  const styles = {
    container: {
      textAlign: ' center',
      backgroundColor: '#fff',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      margin: '2rem auto',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: '2rem',
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
    },
    infoBox: {
      backgroundColor: '#e3f2fd',
      border: '1px solid #2196f3',
      borderRadius: '4px',
      padding: '1rem',
      marginBottom: '1rem',
      fontSize: '0.9rem',
      color: '#0d47a1',
      maxWidth: '80%',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      whiteSpace: 'normal'
    }
  } as any;

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

  const getStream = async (filename: string | null) => {
    if (!filename) {
      sendError({ message: 'No file loaded' });
      return;
    }

    const file = await window.electron.csv.getMetadata(filename);
    setCsvStream(await RemoteStream.create("CSVData", { file }));
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
    sendError(err);
  };

  const sendError = (err: Error) => {
    setError(err.message);
    setTimeout(() => {
      setError('');
    }, 4000);
  };

  const handleSubmit: ReactEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setFileName('');

    const form: HTMLFormElement | undefined = e.target as HTMLFormElement;
    const data = new FormData(form);

    const selected_file = data.get('fileSelect');
    if (selected_file === 'none') return;

    try {
      setFileName(selected_file as string);
      await getStream(selected_file as string);
    } catch (err) {
      handleError(err);
    }
  };

  const handleReset: ReactEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    // Set form select back to 'none'
    const select: HTMLSelectElement | null = document.querySelector(
      'select[name="fileSelect"]'
    );
    if (select) select.value = 'none';

    // Reset reading progress if we have a filename
    if (fileName) {
      csvStream?.cancel();
    }

    // Reset all state
    setFileName('');
    setCsvStream(null);
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
      <div style={styles.container}>
	      <div className="animation-generator-container" style={styles.singlePane}>
	        {/*Used for when things take awhile to load*/}
	        <LoadingOverlay isLoading={isLoading} />
					<div style={styles.infoBox as any}>
						<strong>Real-time Video Recording</strong>
						<br />
						This export method records the animation in real-time as an MP4 video (or WebM if
						MP4 isn't supported). The export will take approximately the same time as the
						animation duration. For example, 20 minutes of data, will take approximately 20
						minutes to export.
						<br />
						<br />
						Ensure that the application remains open and active during the export process.
					</div>
	        {files && (
	          <form
	            method="post"
	            onSubmit={handleSubmit}
	            onReset={handleReset}
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
	                onClick={undefined}
	                className="btn"
	                buttonText="Reset"
	                style={styles.buttonInline as React.CSSProperties}
	              />
	            </div>
	          </form>
	        )}
					{/*Conditionally render the AnimationContainer*/}
	        {fileName !== '' && csvStream && (
	        <>
	        	<h3>Generating Animation...</h3>
						<div>
							{csvStream && (
				        <CanvasRecorder
				          csvStream={csvStream}
									setCsvStream={setCsvStream}
				        />
							)}
						</div>
	        </>
	        )}
	      </div>
      </div>
    </>
  );
}
