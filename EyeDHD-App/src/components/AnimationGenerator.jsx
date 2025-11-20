import { useState, useEffect } from 'react';
import LoadingOverlay from './LoadingOverlay';
import AlertWindow from './AlertWindow';
import Button from './Button';
import AnimationContainer from './AnimationContainer';
import { useRef } from 'react';

export default function AnimationGenerator() {
    const [csvData, setCsvData] = useState([]);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [alertMessage, setAlertMessage] = useState("");
    const [showAlert, setShowAlert] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    const [files, setFiles] = useState(null);

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

    // gets the list of cleaned files
    const getFilesList = async () => {
    	setIsLoading(true);

     	const files = await electron.csv.getFileList().catch(handleError);
      	if (error) return;

       	setFiles(files);

     	setIsLoading(false);
    }

    const loadMoreRows = async (name = null) => {
    	const filename = name ? name : fileName;
        if (!filename) {
            sendError("No file loaded");
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
    }

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

    const handleSubmit = async (e) => {
    	e.preventDefault();

     	const form = e.target;
      	const data = new FormData(form);

       	const selected_file = data.get("fileSelect");
        if (selected_file === "none") return;

        setFileName(selected_file);
        await loadMoreRows(selected_file);
    }

    const handleReset = async (e) => {
    	e.preventDefault();

     	setFileName("");
    }

    useEffect(() => {
    	getFilesList();
    }, []);

    return (
        <div className="animation-generator-container" style={containerStyles}>
            {/*Used for when things take awhile to load*/}
            <LoadingOverlay isLoading={isLoading} />
            {/*Conditionally render an upload message*/}
            {!fileName && files &&
            	<form method="post" onSubmit={handleSubmit} onReset={handleReset}>
	             	<label htmlFor="file-select">
						Please select a file:&nbsp;
		            	<select name="fileSelect" defaultValue="none">
							<option disabled value="none">none</option>
		            		{files.map((file, index) => {
		             			return <option key={index} value={file}>{file}</option>
		             		})}
			            </select>
						&nbsp;to generate an animation.
			        </label>
					<button type="submit">Generate</button>
					<button type="reset">reset</button>
             	</form>
            }
            {/*Conditionally render an error message*/}
            {error && <AlertWindow message={error} classColor=" red" onClose={() => {setError(""); setShowAlert(false)}} />}
            {/*Conditionally render the AnimationContainer*/}
            {fileName &&
            <AnimationContainer csvData={csvData} loadMoreRows={loadMoreRows} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />}
            {/*Conditionally render the alert message*/}
            {showAlert && <AlertWindow message={alertMessage} classColor=" green" onClose={() => setShowAlert(false)} />}
        </div>
    );

    // return (
    //     <div className="animation-generator-container" style={containerStyles}>
    //         {/*Used for when things take awhile to load*/}
    //         <LoadingOverlay isLoading={isLoading} />
    //         {/*Conditionally render an upload message*/}
    //         {!fileName && <p>Please select a file to generate an animation.</p>}
    //         <Button onClick={openFile} className="btn" buttonText="Select a Clean CSV File" />
    //         {/*Conditionally render an error message*/}
    //         {error && <AlertWindow message={error} classColor=" red" onClose={() => {setError(""); setShowAlert(false)}} />}
    //         {/*Conditionally render the AnimationContainer*/}
    //         {fileName &&
    //         <AnimationContainer csvData={csvData} loadMoreRows={loadMoreRows} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />}
    //         {/*Conditionally render the alert message*/}
    //         {showAlert && <AlertWindow message={alertMessage} classColor=" green" onClose={() => setShowAlert(false)} />}
    //     </div>
    // );
}
