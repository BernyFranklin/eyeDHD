import React, { useState } from 'react';

import { useSelector, useDispatch } from '../store/hooks';
import { selectButtons, enableButtons, disableButtons, showAlert } from '../store/features/global';

import PreviewCsvFile from './PreviewCsvFile';
import Button from './Button';
import LoadingOverlay from './LoadingOverlay';

import { type Error, type CSVData, type CaseData } from '../types';
import RemoteStream from '../data/RemoteStream';

type CleaningProgressState = {
	progressPercent: number;
	isComplete: boolean;
	isReading: boolean;
	rowsProcessed: number;
};

const DEFAULT_CLEANING_PROGRESS: CleaningProgressState = {
	progressPercent: 0,
	isComplete: false,
	isReading: false,
	rowsProcessed: 0
};

export default function CsvFileImport() {
	// Store data and handle the file load
	const [csvData, setCsvData] = useState<CSVData[]>([]);
	const [file, setFile] = useState<CaseData | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Data cleaning state
	const [isCleaning, setIsCleaning] = useState(false);
	const [cleaningProgress, setCleaningProgress] = useState<CleaningProgressState>(
		DEFAULT_CLEANING_PROGRESS
	);
	const [showCleaningResults, setShowCleaningResults] = useState(false);

	const buttons = useSelector(selectButtons);
	const dispatch = useDispatch();

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
		if (buttons.disabled) return;
		setIsLoading(true);

		setFile(null);
		setCsvData([]);
		setCleaningProgress(DEFAULT_CLEANING_PROGRESS);
		setShowCleaningResults(false);
		setIsCleaning(false);

		// Request backend to open a file selector, wait for filename
		try {
			const selectedFile = await window.electron.csv.openFile();
			if (!selectedFile) {
				setIsLoading(false);
				return;
			}

			setFile(selectedFile);

			if (selectedFile.completed) {
				setCleaningProgress({
					progressPercent: 100,
					isComplete: true,
					isReading: false,
					rowsProcessed: selectedFile.rows ?? 0
				});

				// Get a stream, load 10 rows and cancel it
				const stream = await RemoteStream.create('CSVData', { file: selectedFile });
				const rows: CSVData[] = [];
				for await (const row of stream) {
					if (rows.length >= 10) {
						break;
					}
					rows.push(row as CSVData);
				}
				stream.cancel();

				setCsvData(rows);
			}
		} catch (err) {
			handleError(err as Error);
		} finally {
			setIsLoading(false);
		}
	};

	// Data cleaning functionality
	const cleanData = async () => {
		if (buttons.disabled) return;
		if (!file) {
			dispatch(showAlert({ color: 'red', message: 'No file selected for cleaning' }));
			return;
		}

		try {
			dispatch(disableButtons());
			setIsCleaning(true);
			setCleaningProgress({
				progressPercent: 0,
				isComplete: false,
				isReading: true,
				rowsProcessed: 0
			});
			setShowCleaningResults(true);

			// Start the cleaning process
			const stream = await RemoteStream.create('Cleaning', { file });

			const previewCSV: CSVData[] = [];
			for await (const row of stream) {
				const { rows, bytesRead, totalBytes } = stream.progress;
				const rowsProcessed = rows ?? 0;

				if (previewCSV.length < 10) {
					previewCSV.push(row as CSVData);
				}

				let progressPercent = 0;
				if (totalBytes && bytesRead) {
					progressPercent = Math.min((bytesRead / totalBytes) * 100, 100);
				} else {
					const estimatedTotalRows = Math.max(file.rows || 0, rowsProcessed, 1);
					progressPercent = Math.min((rowsProcessed / estimatedTotalRows) * 100, 100);
				}

				setCleaningProgress({
					progressPercent,
					isComplete: false,
					isReading: true,
					rowsProcessed
				});
			}

			setCleaningProgress((prev) => ({
				...prev,
				progressPercent: 100,
				isComplete: true,
				isReading: false
			}));

			setFile({ ...file, completed: 1 });
			setCsvData(previewCSV);

			setIsCleaning(false);
			dispatch(enableButtons());
			dispatch(showAlert({ color: 'green', message: 'Data cleaning complete!' }));
		} catch (err) {
			dispatch(enableButtons());
			setIsCleaning(false);
			dispatch(showAlert({ color: 'red', message: err.message }));
		}
	};

	// Export cleaned CSV data to a new file
	const exportCleanedData = async () => {
		if (buttons.disabled) return;
		if (!file) {
			dispatch(showAlert({ color: 'red', message: 'No file selected for export' }));
			return;
		}

		// Check if cleaning is complete
		if (!cleaningProgress.isComplete && !file.completed) {
			dispatch(showAlert({ color: 'red', message: 'No cleaned data available. Please clean the data first.' }));
			return;
		}

		try {
			setIsLoading(true);
			const result = await window.electron.csv.exportData(file);

			if (result.success) {
				dispatch(showAlert({
					color: 'green',
					message: `Successfully exported ${result.stats.totalExported} rows to ${result.stats.filePath
						.split('\\\\')
						.pop()}`
				}));
			} else {
				dispatch(showAlert({ color: 'red', message: result.message || 'Export failed' }));
			}
		} catch (err) {
			dispatch(showAlert({ color: 'red', message: err.message }));
		} finally {
			setIsLoading(false);
		}
	};

	const clearFile = async () => {
		if (buttons.disabled) return;
		setCsvData([]);
		setCleaningProgress(DEFAULT_CLEANING_PROGRESS);
		setShowCleaningResults(false);
		setIsCleaning(false);

		if (file) {
			await window.electron.csv.resetCleaningProgress(file).catch(handleError);
		}
		setFile(null);
	};

	const handleError = (err: Error) => {
		dispatch(showAlert({ color: 'red', message: err.message }));
	};

	return (
		<div className="csv-import-container">
			<LoadingOverlay isLoading={isLoading} />
			<Button
				onClick={openFile}
				className={`btn ${buttons.disabled ? 'disabled' : ''}`}
				disabled={buttons.disabled}
				buttonText="Select a CSV File"
			/>
			{file && (
				<>
					<PreviewCsvFile fileName={file.name} csvData={csvData} />

					{/* Data Cleaning Section */}
					{showCleaningResults && cleaningProgress && (
						<div style={styles.cleaningContainer}>
							<h3>Data Cleaning {isCleaning ? 'In Progress...' : 'Results'}</h3>
							{/* Cleaning progress  */}
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
						{!cleaningProgress.isComplete && (
							<Button
							onClick={isCleaning ? undefined : cleanData}
							className={`btn${isCleaning ? ' disabled' : ''}`}
							buttonText={isCleaning ? 'Cleaning...' : 'Clean Data'}
							/>
						)}
						<Button
							onClick={exportCleanedData}
							className={`btn${buttons.disabled || !cleaningProgress.isComplete ? ' disabled' : ''}`}
							buttonText="Export Clean Data"
							disabled={buttons.disabled || !cleaningProgress.isComplete}
						/>
						<Button
							onClick={clearFile}
							className={`btn ${buttons.disabled ? 'disabled' : ''}`}
							buttonText="Clear File"
							disabled={buttons.disabled}
						/>
					</div>
				</>
			)}
		</div>
	);
}