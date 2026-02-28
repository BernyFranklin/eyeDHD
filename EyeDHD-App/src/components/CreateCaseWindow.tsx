import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useDispatch } from '../store/hooks';
import { showAlert } from '../store/features/global';
import { setCases, setSelectedCase } from '../store/features/user';
import Button from './Button';
import RemoteStream from '../data/RemoteStream';
import { type CaseData } from '../types';

type Props = {
	isOpen: boolean;
	onClose: () => void;
};

export function CreateCaseWindow(props: Props) {
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [caseName, setCaseName] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (props.isOpen) {
			setCaseName('');
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [props.isOpen]);

	const handleConfirm = async () => {
		const trimmedName = caseName.trim();

		if (!trimmedName) {
			dispatch(showAlert({ color: 'red', message: 'Please enter a case name.' }));
			return;
		}

		try {
			setIsSubmitting(true);
			const createdCase = await window.electron.case.createNew(trimmedName);
			dispatch(setSelectedCase(createdCase));

			const stream = await RemoteStream.create('CaseData', {});
			const cases = await stream.collect<CaseData>();
			dispatch(setCases(cases));

			props.onClose();
			navigate('/case');
		} catch (err: any) {
			dispatch(showAlert({
				color: 'red',
				message: `Error creating case: ${err.message}`
			}));
		} finally {
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
				onClick={(event) => event.stopPropagation()}
			>
				<div className='create-case-title'>
					Create a new case
				</div>
				<input
					ref={inputRef}
					className='create-case-input'
					value={caseName}
					onChange={(event) => setCaseName(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							handleConfirm();
						}
					}}
					placeholder='Enter case name'
					disabled={isSubmitting}
				/>
				<div className='create-case-actions'>
					<Button
						onClick={handleConfirm}
						disabled={isSubmitting || !caseName.trim()}
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
						width: 520px;
						max-width: 90vw;
						padding: 24px;
						background: #fff;
						border-radius: 12px;
						box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
						display: flex;
						flex-direction: column;
						align-items: stretch;
						gap: 12px;
					}

					.create-case-title {
						font-size: 18px;
						font-weight: 600;
						text-align: center;
					}

					.create-case-input {
						width: 100%;
						min-height: 44px;
						padding: 10px;
						border-radius: 8px;
						border: 1px solid #444;
						resize: none;
						align-self: stretch;
						margin: 0;
						box-sizing: border-box;
						font-size: 14px;
					}

					.create-case-actions {
						display: flex;
						justify-content: flex-end;
						width: 100%;
					}
				`}
			</style>
		</div>
	);
}