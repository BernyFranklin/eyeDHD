import React, { useState, useEffect, ReactEventHandler } from 'react';

import { useSelector, useDispatch } from '../store/hooks';
import { selectButtons, enableButtons, disableButtons } from '../store/features/global';

import LoadingOverlay from './LoadingOverlay';
import AlertWindow, { useAlert } from './AlertWindow';
import Button from './Button';
import CanvasRecorder from './CanvasRecorder';

import { type Error, type CSVData, type CaseData } from '../types';
import RemoteStream from '../data/RemoteStream';

export default function AnimationGenerator() {
	const [files, setFiles] = useState<CaseData[]>([]);
	const [file, setFile] = useState<CaseData | null>(null);
	const [csvStream, setCsvStream] = useState<RemoteStream | null>(null);

	const alert = useAlert();
	const [isLoading, setIsLoading] = useState(false);

	const buttons = useSelector(selectButtons);
	const dispatch = useDispatch();

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

	const getFilesList = async () => {
		setIsLoading(true);

		if (files.length > 0) return;

		const stream = await RemoteStream.create("CaseData", {});
		try {
			const files = await stream.collect<CaseData>();
			const cleaned = files.filter((metadata: CaseData) => metadata.completed);

			setFiles(cleaned);
		} catch (err) {
			stream.cancel();
			handleError(err);
		}

		setIsLoading(false);
	};

	const getStream = async (file: CaseData | null) => {
		if (!file) {
			alert.show('red', 'No file loaded');
			return;
		}

		setCsvStream(await RemoteStream.create("CSVData", { file }));
	};

	const handleError = (err: Error) => {
		alert.show('red', err.message);
	};

	const handleSubmit: ReactEventHandler<HTMLFormElement> = async (e) => {
		e.preventDefault();
		if (buttons.disabled) return;
		setFile(null);

		const form: HTMLFormElement | undefined = e.target as HTMLFormElement;
		const data = new FormData(form);

		const selected_file = data.get('fileSelect');
		if (selected_file === 'none') return;

		const metadata = files.find((file) => file.name === selected_file);

		try {
			setFile(metadata);
			await getStream(metadata);
		} catch (err) {
			handleError(err);
		}
	};

	const handleReset: ReactEventHandler<HTMLFormElement> = async (e) => {
		e.preventDefault();
		if (buttons.disabled) return;

		// Set form select back to 'none'
		const select: HTMLSelectElement | null = document.querySelector(
			'select[name="fileSelect"]'
		);
		if (select) select.value = 'none';

		// Reset reading progress if we have a filename
		if (file) {
			csvStream?.cancel();
		}

		// Reset all state
		setFile(null);
		setCsvStream(null);
	};

	useEffect(() => {
		getFilesList();
	}, []);

	useEffect(() => {
		if (csvStream) {
			dispatch(disableButtons());
		} else {
			dispatch(enableButtons());
		}
	}, [csvStream]);

	return (
		<>
     		{/* Alert message */}
       		<AlertWindow alert={alert} />
           	<div style={styles.container}>
	           	<div className="animation-generator-container" style={styles.singlePane}>
	           		{/*Used for when things take awhile to load*/}
	             	<LoadingOverlay isLoading={isLoading} />
					<div style={styles.infoBox as React.CSSProperties}>
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
		              		<select name="fileSelect" defaultValue="none" disabled={buttons.disabled}>
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
				                onClick={undefined}
				                className={`btn ${buttons.disabled ? 'disabled' : ''}`}
				                buttonText="Generate"
				                style={styles.buttonInline as React.CSSProperties}
				                disabled={buttons.disabled}
						    />
		              		<Button
		                		type="reset"
				                onClick={undefined}
				                className={`btn ${buttons.disabled ? 'disabled' : ''}`}
				                buttonText="Reset"
				                style={styles.buttonInline as React.CSSProperties}
				                disabled={buttons.disabled}
						    />
		            	</div>
		          	</form>
		        )}
					{/*Conditionally render the AnimationContainer*/}
	        		{file && csvStream && (
		        		<>
		        			<h3>Generating Animation...</h3>
							<div>
								{csvStream && (
				        			<CanvasRecorder
										file={file}
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
