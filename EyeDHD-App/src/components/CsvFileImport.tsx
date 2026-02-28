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
				className={buttons.disabled ? 'disabled' : ''}
				disabled={buttons.disabled}
			>
				Select a CSV File
			</Button>
			{file && (
				<>
					<PreviewCsvFile fileName={file.name} csvData={csvData} />

					{/* Data Cleaning Section */}
					{showCleaningResults && cleaningProgress && (
						<div className="csv-cleaning-container">
							<h3>Data Cleaning {isCleaning ? 'In Progress...' : 'Results'}</h3>
							{/* Cleaning progress  */}
							<div>
								<div className="csv-progress-bar">
									<div
										className="csv-progress-fill"
										style={{ ['--progress-width' as any]: `${cleaningProgress.progressPercent}%` }}
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
								<div className="csv-stats-grid">
								<div className="csv-stat-item">
								<strong>Total Rows:</strong>{' '}
								{(cleaningStats.stats.totalRows || 0).toLocaleString()}
								</div>
								<div className="csv-stat-item">
								<strong>Error Rows:</strong>{' '}
								{(cleaningStats.stats.errorRows || 0).toLocaleString()}
								</div>
								</div>
								)*/}
						</div>
					)}

					{/* File action buttons */}
					<div className="csv-button-container">
						{!cleaningProgress.isComplete && (
							<Button
								onClick={isCleaning ? undefined : cleanData}
								className={isCleaning ? 'disabled' : ''}
							>
								{isCleaning ? 'Cleaning...' : 'Clean Data'}
							</Button>
						)}
						<Button
							onClick={exportCleanedData}
							className={buttons.disabled || !cleaningProgress.isComplete ? 'disabled' : ''}
							disabled={buttons.disabled || !cleaningProgress.isComplete}
						>
							Export Clean Data
						</Button>
						<Button
							onClick={clearFile}
							className={buttons.disabled ? 'disabled' : ''}
							disabled={buttons.disabled}
						>
							Clear File
						</Button>
					</div>
				</>
			)}
			<style>{`
				.csv-import-container {
					text-align: center;
					background-color: #fff;
					padding: 2rem;
					display: flex;
					flex-direction: column;
					width: 60%;
					margin: 2rem auto;
					align-items: center;
				}

				.csv-cleaning-container {
					margin: 20px 0;
					padding: 15px;
					background-color: #f5f5f5;
					border-radius: 8px;
					border: 1px solid #ddd;
				}

				.csv-progress-bar {
					width: 400px;
					height: 20px;
					background-color: #e0e0e0;
					border-radius: 10px;
					overflow: hidden;
					margin: 0 auto 10px auto;
				}

				.csv-progress-fill {
					height: 100%;
					background-color: #4caf50;
					transition: width 0.3s ease;
					width: var(--progress-width, 0%);
				}

				.csv-button-container {
					display: flex;
					flex-direction: row;
					justify-content: center;
					gap: 20px;
				}

				.csv-stats-grid {
					display: flex;
					flex-direction: row;
					justify-content: space-between;
					gap: 10px;
					margin-top: 10px;
				}

				.csv-stat-item {
					padding: 8px 12px;
					background-color: white;
					border-radius: 4px;
					border: 1px solid #ccc;
				}
			`}</style>
		</div>
	);
}