import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useDispatch } from '../../data/hooks';
import { showAlert } from '../../data/features/global';
import { setSelectedCase } from '../../data/features/user';
import { Button } from '../../components';

type Props = {
	isOpen: boolean;
	onClose: () => void;
};

type ImportStatus = 'waiting' | 'success' | 'error';

/**
 * Modal window for creating a new case, allows user to input case name and select
 * a CSV/VR file to import. Shows import status for each step as a border around
 * the textareas.
 */
export default function CreateCaseWindow(props: Props) {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement | null>(null);

	const [caseName, setCaseName] = useState('');

	const [csvLabel, setCsvLabel] = useState('');
	const [csvStatus, setCsvStatus] = useState<ImportStatus>('waiting');

	const [vrLabel, setVrLabel] = useState('');
	const [vrStatus, setVrStatus] = useState<ImportStatus>('waiting');

	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (props.isOpen) {
			setCaseName('');
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [props.isOpen]);

	const handleSelectCsv = async () => {
		try {
			const filepath = await window.electron.case.selectCsv();
			if (!filepath) {
				return;
			}

			setCsvLabel(filepath);
			setCaseName(filepath.split('\\').slice(-1)[0].replace('.csv', ''));
			setCsvStatus('success');
		} catch (err) {
			dispatch(showAlert({
				color: 'red',
				message: `Error selecting CSV: ${err.message}`
			}));
		}
	};

	const handleConfirm = async () => {
		const trimmedName = caseName.trim();

		if (!csvLabel) {
			dispatch(showAlert({
				color: 'red',
				message: 'Please select a CSV file before confirming.'
			}));

			return;
		}

		try {
			setIsSubmitting(true);
			setCsvStatus('waiting');
			setVrStatus('waiting');

			const createdCase = await window.electron.case
				.createNew(trimmedName)
				.catch(err => {throw err});
			dispatch(setSelectedCase(createdCase));

			const updatedCase = await window.electron.case.importCsv(
				createdCase,
				csvLabel
			).catch(err => {
				setCsvStatus('error');
				throw err;
			});
			dispatch(setSelectedCase(updatedCase));
			setCsvStatus('success');

			await new Promise((resolve) => setTimeout(resolve, 1000));

			props.onClose();
			setIsSubmitting(false);

			navigate('/case');
		} catch (err) {
			dispatch(showAlert({
				color: 'red',
				message: `Error creating case: ${err.message}`
			}));

			setIsSubmitting(false);
		}
	};

	const getImportBorder = (status: ImportStatus) => {
		return `import-${status}`;
	}

	if (!props.isOpen) {
		return null;
	}

	return (
		<div
			className='create-case-overlay'
			role='dialog'
			aria-modal='true'
			aria-label='Create new case'
			onClick={props.onClose}
		>
			<div
				className='create-case-window'
				onClick={(event) => !isSubmitting && event.stopPropagation()}
			>
				<div className='case-name-col'>
					<div className='case-name-title'>
						Case name
					</div>
					<textarea
						className={`text-area-input case-name-input`}
						value={caseName}
						aria-label='Select a CSV file'
						placeholder='Select a CSV file'
						readOnly
						aria-readonly='true'
						tabIndex={-1}
						disabled={isSubmitting}
					/>
				</div>
				<div className='import-file-col'>
					<div className='case-name-title'>
						Import case files
					</div>
					<div className='import-file-row'>
						<textarea
							className={
								`text-area-input import-input ${getImportBorder(csvStatus)}`
							}
							onClick={handleSelectCsv}
							value={csvLabel.split('\\').slice(-1)[0] || ''}
							readOnly
							aria-label='Select a CSV file'
							placeholder='Select a CSV file'
							disabled={isSubmitting}
						/>
					</div>
					<div className='import-file-row'>
						<textarea
							className={
								`text-area-input import-input ${getImportBorder(vrStatus)}`
							}
							value={vrLabel.split('\\').slice(-1)[0] || ''}
							readOnly
							aria-label='VR video selection coming soon'
							placeholder='VR video selection coming soon'
							disabled={isSubmitting}
						/>
					</div>
				</div>
				<div className='create-case-actions'>
					<Button
						onClick={handleConfirm}
						disabled={isSubmitting || !caseName || !csvLabel}
					>
						confirm
					</Button>
				</div>
			</div>

			<style>
				{`
					.create-case-overlay {
						position: fixed;
						inset: 0;
						background: rgba(0, 0, 0, 0.45);
						display: flex;
						align-items: center;
						justify-content: center;
						z-index: 1000;
					}

					.create-case-window {
						width: 720px;
						max-width: 92vw;
						padding: 24px;
						background: #fff;
						border-radius: 12px;
						box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
						display: grid;
						grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
						align-items: start;
						gap: 16px 24px;
					}

					.case-name-col {
						display: flex;
						flex-direction: column;
						gap: 12px;
					}

					.case-name-title {
						font-size: 16px;
						font-weight: 600;
					}

					.text-area-input {
						width: 100%;
						height: 44px;
						padding: 10px;
						border-radius: 8px;
						resize: none;
						align-self: stretch;
						margin: 0;
						box-sizing: border-box;
						font-size: 14px;
					}

					.text-area-input:focus,
					.text-area-input:focus-visible {
						outline: none;
						box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
					}

					.case-name-input {
						cursor: default;
						pointer-events: none;
					}

					.import-input {
						cursor: pointer;
					}

					.import-waiting {
						border: 2px solid #5A5A5A;
						animation: import-waiting-pulse 1.4s ease-in-out infinite;
						box-shadow: 0 0 0 0 rgba(90, 90, 90, 0.45);
					}

					.import-success {
						border: 2px solid #00A000;
					}

					.import-error {
						border: 2px solid #B1102B;
					}

					.create-case-actions {
						grid-column: 1 / -1;
						display: flex;
						justify-content: flex-end;
						width: 100%;
						margin-top: 4px;
					}

					.import-file-col {
						display: flex;
						flex-direction: column;
						gap: 12px;
					}

					.import-file-row {
						display: flex;
						flex-direction: column;
						gap: 6px;
					}

					.cursor-pointer {
						cursor: pointer;
					}

					@keyframes import-waiting-pulse {
						0% {
							border-color: #5A5A5A;
							box-shadow: 0 0 0 0 rgba(90, 90, 90, 0.45);
						}
						50% {
							border-color: #2F2F2F;
							box-shadow: 0 0 0 6px rgba(90, 90, 90, 0.3);
						}
						100% {
							border-color: #5A5A5A;
							box-shadow: 0 0 0 0 rgba(90, 90, 90, 0.45);
						}
					}
				`}
			</style>
		</div>
	);
}