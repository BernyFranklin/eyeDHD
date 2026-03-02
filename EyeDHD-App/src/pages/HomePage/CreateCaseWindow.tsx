import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useDispatch } from '../../data/hooks';
import { showAlert } from '../../data/features/global';
import { setSelectedCase } from '../../data/features/user';
import Button from '../../components/Button';

type Props = {
	isOpen: boolean;
	onClose: () => void;
};

type ImportStatus = 'waiting' | 'success' | 'error';

export default function CreateCaseWindow(props: Props) {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement | null>(null);

	const [caseName, setCaseName] = useState('');
	const [caseNameStatus, setCaseNameStatus] = useState<ImportStatus>('waiting');

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
			setCaseNameStatus('waiting');
			setCsvStatus('waiting');
			setVrStatus('waiting');

			const createdCase = await window.electron.case
				.createNew(trimmedName)
				.catch(err => {
					setCaseNameStatus('error');
					throw err;
				});
			dispatch(setSelectedCase(createdCase));
			setCaseNameStatus('success');

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
				<div className='create-case-col'>
					<div className='create-case-title'>
						Create a new case
					</div>
					<input
						ref={inputRef}
						className={
							`create-case-input ${getImportBorder(caseNameStatus)}`
						}
						value={caseName}
						onChange={(event) => {
							const nextValue = event.target.value;
							setCaseName(nextValue.trim());

							if (nextValue.trim() === '') {
								setCaseNameStatus('error');
							} else {
								setCaseNameStatus('success');
							}
						}}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								handleConfirm();
							}
						}}
						placeholder='Enter case name'
						disabled={isSubmitting}
					/>
				</div>
				<div className='import-file-col'>
					{/*
						These need disclaimer that file will be renamed to match chosen
						case name
					*/}
					<div className='create-case-title'>
						Import case files
					</div>
					<div className='import-file-row'>
						<textarea
							className={
								`create-case-input cursor-pointer ${getImportBorder(csvStatus)}`
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
								`create-case-input cursor-pointer ${getImportBorder(vrStatus)}`
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

					.create-case-col {
						display: flex;
						flex-direction: column;
						gap: 12px;
					}

					.create-case-title {
						font-size: 16px;
						font-weight: 600;
					}

					.create-case-input {
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

					.import-waiting {
						border: 2px solid #7A7A7A;
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

					.create-case-input:focus,
					.create-case-input:focus-visible {
						outline: none;
						box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
					}
				`}
			</style>
		</div>
	);
}