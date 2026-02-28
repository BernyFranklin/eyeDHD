import React, { useState } from 'react';

import { useSelector, useDispatch } from '../store/hooks';
import { showAlert } from '../store/features/global';
import { selectSelectedCase } from '../store/features/user';
import Button from './Button';

type Props = {
	isOpen: boolean;
	onClose: () => void;
};

export default function FileImportWindow(props: Props) {
	const dispatch = useDispatch();
	const selectedCase = useSelector(selectSelectedCase);

	const [csvLabel, setCsvLabel] = useState('No CSV selected yet');
	const [selectedCsvPath, setSelectedCsvPath] = useState<string | null>(null);
	const [vrLabel] = useState('VR video selection coming soon');
	const [isSelecting, setIsSelecting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);

	const handleSelectCsv = async () => {
		if (!selectedCase) {
			dispatch(showAlert({ color: 'red', message: 'Select a case before selecting a CSV.' }));
			return;
		}

		try {
			setIsSelecting(true);
			const filepath = await window.electron.case.selectCsv();

			if (!filepath) {
				return;
			}

			const displayName = filepath.split(/[\\/]/).pop() ?? filepath;
			setSelectedCsvPath(filepath);
			setCsvLabel(displayName);
		} catch (err) {
			dispatch(showAlert({
				color: 'red',
				message: `Error selecting CSV: ${err.message}`
			}));
		} finally {
			setIsSelecting(false);
		}
	};

	const handleConfirm = async () => {
		if (!selectedCase) {
			dispatch(showAlert({ color: 'red', message: 'Select a case before confirming import.' }));
			return;
		}

		if (!selectedCsvPath) {
			dispatch(showAlert({ color: 'red', message: 'Please select a CSV file before confirming.' }));
			return;
		}

		try {
			setIsImporting(true);
			const updatedCase = await window.electron.case.importCsv(selectedCase, selectedCsvPath);
			setCsvLabel(`Imported: ${updatedCase.name}`);
			props.onClose();
		} catch (err) {
			dispatch(showAlert({
				color: 'red',
				message: `Error importing CSV: ${err.message}`
			}));
		} finally {
			setIsImporting(false);
		}
	};

	if (!props.isOpen) {
		return null;
	}

	return (
		<div
			className='file-import-overlay'
			role='dialog'
			aria-modal='true'
			aria-label='Import CSV and VR files'
		>
			<div className='file-import-window'>
				<div className='file-import-title'>
					Import case files
				</div>

				<div className='file-import-row'>
					<label className='file-import-label'>CSV file</label>
					<textarea
						className='file-import-input'
						onClick={handleSelectCsv}
						value={csvLabel}
						readOnly
						aria-label='Click to select a CSV file'
					/>
				</div>

				<div className='file-import-row'>
					<label className='file-import-label'>VR video (optional)</label>
					<textarea
						className='file-import-input file-import-input--disabled'
						value={vrLabel}
						readOnly
						aria-label='VR video selection coming soon'
					/>
				</div>

				<div className='file-import-footer'>
					<Button
						onClick={handleConfirm}
						disabled={!selectedCsvPath || isImporting || isSelecting}
					>
						confirm
					</Button>
				</div>
			</div>

			<style>
				{`
					.file-import-overlay {
						position: fixed;
						inset: 0;
						background: rgba(0, 0, 0, 0.45);
						display: flex;
						align-items: center;
						justify-content: center;
						z-index: 1000;
					}

					.file-import-window {
						width: 520px;
						max-width: 90vw;
						padding: 24px;
						background: #fff;
						border-radius: 12px;
						box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
						display: flex;
						flex-direction: column;
						align-items: stretch;
						gap: 16px;
					}

					.file-import-title {
						font-size: 18px;
						font-weight: 600;
						text-align: center;
					}

					.file-import-row {
						display: flex;
						flex-direction: column;
						gap: 8px;
					}

					.file-import-label {
						font-size: 14px;
						font-weight: 600;
					}

					.file-import-input {
						width: 100%;
						min-height: 64px;
						padding: 10px;
						border-radius: 8px;
						border: 1px solid #444;
						resize: none;
						cursor: pointer;
						align-self: stretch;
						margin: 0;
						box-sizing: border-box;
					}

					.file-import-input--disabled {
						cursor: not-allowed;
						opacity: 0.7;
					}

					.file-import-actions {
						display: flex;
						justify-content: flex-end;
						width: 100%;
					}

					.file-import-footer {
						display: flex;
						justify-content: flex-end;
						width: 100%;
					}
				`}
			</style>
		</div>
	);
}