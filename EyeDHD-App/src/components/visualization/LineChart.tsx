import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { useEffect, useState } from 'react';

import LoadingOverlay from '../LoadingOverlay.jsx';
import AlertWindow from '../AlertWindow.jsx';
import Button from '../Button.jsx';

// #region Sample data
const data = [
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400
  },
  {
    name: 'Page B',
    uv: 300,
    pv: 4567,
    amt: 2400
  },
  {
    name: 'Page C',
    uv: 320,
    pv: 1398,
    amt: 2400
  },
  {
    name: 'Page D',
    uv: 200,
    pv: 9800,
    amt: 2400
  },
  {
    name: 'Page E',
    uv: 278,
    pv: 3908,
    amt: 2400
  },
  {
    name: 'Page F',
    uv: 189,
    pv: 4800,
    amt: 2400
  }
];

// #endregion
export const Chart = () => {
  const [csvData, setCsvData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  const [files, setFiles] = useState(null);

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
  };

  // gets the list of cleaned files
  const getFilesList = async () => {
    setIsLoading(true);

    const files = await window.electron.csv.getFileList().catch(handleError);
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
    const rows = await window.electron.csv.getBuffer(filename).catch(handleError);
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
    setIsHidden(false);

    const form = e.target;
    const data = new FormData(form);

    const selected_file = data.get('fileSelect');
    if (selected_file === 'none') return;

    await window.electron.csv.resetReadingProgress(selected_file).catch(handleError);

    setFileName(selected_file);
    await loadMoreRows(selected_file);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setIsHidden(true);

    // Set form select back to 'none'
    const form = e.target;
    const select = document.querySelector('select[name="fileSelect"]');
    if (select) select.value = 'none';

    // Reset reading progress if we have a filename
    if (fileName) {
      await window.electron.csv.resetReadingProgress(fileName).catch(handleError);
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
      <div className="dilation-chart-container" style={styles.container}>
        {/*Used for when things take awhile to load*/}
        <LoadingOverlay isLoading={isLoading} />
        <div
          className="left-pane"
          style={isHidden ? { ...styles.leftPane, width: 'auto' } : styles.leftPane}
        >
          <h3>Chart Dilation</h3>
          {files && (
            <form method="post" onSubmit={handleSubmit} onReset={handleReset}>
              <label htmlFor="file-select">Please select a file to chart dilation.</label>
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
                  onClick={() => {}}
                  className="btn"
                  buttonText="Chart"
                  style={styles.buttonInline}
                />
                <Button
                  type="reset"
                  onClick={handleReset}
                  className="btn"
                  buttonText="Reset"
                  style={styles.buttonInline}
                />
              </div>
            </form>
          )}
          {/*Conditionally render the LineChart*/}
          {fileName !== '' && (
            <LineChart
              style={{ width: '100%', aspectRatio: 1.618, maxWidth: 600 }}
              responsive
              data={csvData}
              margin={{
                top: 20,
                right: 20,
                bottom: 5,
                left: 0
              }}
            >
              <CartesianGrid stroke="#aaa" strokeDasharray="5 5" />
              <Line
                type="monotone"
                dataKey="LeftPupilDiameterInMM"
                stroke="purple"
                strokeWidth={2}
                name="Left Dilation"
              />
              <XAxis dataKey="CaptureTime" />
              <YAxis
                width="auto"
                label={{ value: 'DILATION', position: 'insideLeft', angle: -90 }}
              />
              <Legend align="right" />
              <Tooltip />
            </LineChart>
          )}
        </div>
      </div>
    </>
  );
};
