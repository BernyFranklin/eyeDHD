import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import { Button, Textarea } from '@src/components';
import { AlertControls } from '@src/components/AlertWindow';

import { useDispatch, useSelector } from '@src/data/hooks';
import { selectCases, setSelectedCase } from '@src/data/features/user';

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
	const cases = useSelector(selectCases);

	const [casename, setCasename] = useState('');

	const [csvLabel, setCsvLabel] = useState('');
	const [csvStatus, setCsvStatus] = useState<ImportStatus>('waiting');

	const [vrLabel] = useState('');
	const [vrStatus, setVrStatus] = useState<ImportStatus>('error');

	const [isSubmitting, setIsSubmitting] = useState(false);

	const getFilename = (filepath: string) => {
		return filepath.split(/[/\\]/).slice(-1)[0] || '';
	};

	const getCasename = (filepath: string) => {
		const filename = getFilename(filepath);
		return filename.replace(/\.csv$/i, '');
	};

	const handleSelectCsv = async () => {
		try {
			const filepath = await window.electron.case.selectCsv();
			if (!filepath) {
				return;
			}

			if (cases.some(c => c.name === getCasename(filepath))) {
				setCsvStatus('error');
				setCsvLabel('A Case with this name already exists, select a different CSV');
				return;
			}

			setCsvLabel(filepath);
			setCasename(getCasename(filepath));
			setCsvStatus('success');
		} catch (err) {
			AlertControls.error(`Error selecting CSV: ${err.message}`);
		}
	};

	const handleConfirm = async () => {
		const trimmedName = casename.trim();

		try {
			setIsSubmitting(true);
			setCsvStatus('waiting');
			setVrStatus('waiting');

			const createdCase = await window.electron.case.createNew(trimmedName);
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

			navigate('/processing');
		} catch (err) {
			AlertControls.error(`Error creating case: ${err.message}`);

			setIsSubmitting(false);
		}
	};

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
					<Textarea
						variant='compact-static'
						value={casename}
						aria-label='Select a CSV file'
						placeholder='Select a CSV file'
						aria-readonly='true'
						tabIndex={-1}
						disabled={isSubmitting}
						readOnly
					/>
				</div>
				<div className='import-file-col'>
					<div className='case-name-title'>
						Import case files (Required)
					</div>
					<div className='import-file-row'>
						<Textarea
							variant='compact-clickable'
							status={csvStatus}
							onClick={handleSelectCsv}
							value={getFilename(csvLabel)}
							aria-label='Click to select a CSV file'
							placeholder='Click to select a CSV file'
							disabled={isSubmitting}
							readOnly
						/>
					</div>
					<div className='import-file-row'>
						<Textarea
							variant='compact-static'
							status={vrStatus}
							value={getFilename(vrLabel)}
							aria-label='VR video selection coming soon'
							placeholder='VR video selection coming soon'
							disabled={true}
							readOnly
						/>
					</div>
				</div>
				<div className='create-case-actions'>
					<Button
						onClick={handleConfirm}
						disabled={isSubmitting || !casename || !csvLabel}
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
						border-radius: var(--action-radius);
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
				`}
			</style>
		</div>
	);
}