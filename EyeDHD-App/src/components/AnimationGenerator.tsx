import React, { useState, useEffect, ReactEventHandler } from 'react';

import { useSelector, useDispatch } from '../store/hooks';
import { showAlert, selectButtons, enableButtons, disableButtons } from '../store/features/global';

import LoadingOverlay from './LoadingOverlay';
import Button from './Button';
import CanvasRecorder from './CanvasRecorder';

import { type Error, type CSVData, type CaseData } from '../types';
import RemoteStream from '../data/RemoteStream';

export default function AnimationGenerator() {
	const [files, setFiles] = useState<CaseData[]>([]);
	const [file, setFile] = useState<CaseData | null>(null);
	const [csvStream, setCsvStream] = useState<RemoteStream | null>(null);

	const [isLoading, setIsLoading] = useState(false);

	const buttons = useSelector(selectButtons);
	const dispatch = useDispatch();



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
			dispatch(showAlert({ color: 'red', message: 'No file loaded' }));
			return;
		}

		setCsvStream(await RemoteStream.create("CSVData", { file }));
	};

	const handleError = (err: Error) => {
		dispatch(showAlert({ color: 'red', message: err.message }));
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
           	<div className="animation-generator-page">
	           	<div className="animation-generator-panel">
	           		{/*Used for when things take awhile to load*/}
	             	<LoadingOverlay isLoading={isLoading} />
					<div className="animation-generator-info">
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
				        <div className="animation-generator-actions">
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
				                className={`animation-generator-button${buttons.disabled ? ' disabled' : ''}`}
				                disabled={buttons.disabled}
						    >
						    	Generate
						    </Button>
		              		<Button
		                		type="reset"
				                onClick={undefined}
				                className={`animation-generator-button${buttons.disabled ? ' disabled' : ''}`}
				                disabled={buttons.disabled}
						    >
						    	Reset
						    </Button>
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
				<style>{`
					.animation-generator-page {
						text-align: center;
						background-color: #fff;
						padding: 2rem;
						display: flex;
						flex-direction: column;
						width: 100vw;
						margin: 2rem auto;
						align-items: stretch;
						justify-content: center;
						gap: 2rem;
					}

					.animation-generator-panel {
						width: 40%;
						padding: 1rem;
						border: 1px solid #ccc;
						border-radius: 8px;
						display: flex;
						flex-direction: column;
						justify-content: space-between;
						align-items: center;
					}

					.animation-generator-info {
						background-color: #e3f2fd;
						border: 1px solid #2196f3;
						border-radius: 4px;
						padding: 1rem;
						margin-bottom: 1rem;
						font-size: 0.9rem;
						color: #0d47a1;
						max-width: 80%;
						word-wrap: break-word;
						overflow-wrap: break-word;
						white-space: normal;
					}

					.animation-generator-actions {
						display: flex;
						flex-direction: row;
						gap: 10px;
						justify-content: center;
						margin-top: 1rem;
					}

					.animation-generator-button {
						display: inline-block;
					}
				`}</style>
          	</div>
   	</>
	);
}
