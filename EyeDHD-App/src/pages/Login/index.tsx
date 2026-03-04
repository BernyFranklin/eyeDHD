import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button, Textarea } from '@src/components';
import { AlertControls } from '@src/components/AlertWindow';

import { useSelector, useDispatch } from '@src/data/hooks';
import { selectLoading } from '@src/data/features/global';
import { selectProjectDir, selectProjectInitialized, setProjectDir, setProjectInitialized } from '@src/data/features/user';

type SelectStatus = 'waiting' | 'success' | 'error';

/**
 * Modal window that prompts user to select a project directory if one is not set
 * or initialized. Shows status of directory selection and initialization as a border
 * around the textarea. Once a directory is selected, user can confirm to initialize
 * it as the project directory.
 */
export default function Login() {
	const dispatch = useDispatch();
	const projectDir = useSelector(selectProjectDir);
	const projectInitialized = useSelector(selectProjectInitialized);
	const loading = useSelector(selectLoading);

	const navigate = useNavigate();

	const [placeholder, setPlaceholder] = useState('Please select an empty folder');
	const [selectStatus, setSelectStatus] = useState<SelectStatus>('waiting');

	const selectDir = async () => {
		try {
			setSelectStatus('waiting');

			const user = await window.electron.user.read();
			const project = await window.electron.user.selectDirectory(user);

			if (!project) {
				setSelectStatus('error');
				setPlaceholder('No folder selected');
				return;
			}

			if (!project.dir) {
				setSelectStatus('error');
				setPlaceholder('No folder selected');
				return;
			}

			if (!project.status.empty) {
				setSelectStatus('error');
				setPlaceholder('Selected folder is not empty');
				return;
			}

			dispatch(setProjectDir(project.dir));
			setSelectStatus('success');
		} catch (err) {
			AlertControls.show(`Error selecting directory: ${err.message}`, 'red');
		}
	}

	const handleConfirm = async () => {
		if (!projectDir) {
			return;
		}

		try {
			const user = await window.electron.user.read();
			const updatedUser = await window.electron.user.initializeDirectory(
				projectDir,
				user
			);

			dispatch(setProjectDir(updatedUser.dir));
			dispatch(setProjectInitialized(!!updatedUser.project_initialized));
		} catch (err) {
			AlertControls.show(`Error initializing directory: ${err.message}`, 'red');
		}
	};



	useEffect(() => {
		if (projectDir && projectInitialized) {
			navigate('/home');
		}
	}, [projectDir, projectInitialized]);

	if (loading) {
		return null;
	}

	return (
		<div
			className='dir-prompt-overlay'
			role='dialog'
			aria-modal='true'
			aria-label='Select project directory'
		>
			<div className='dir-prompt-window'>
				<div className='dir-prompt-title'>
					Project folder needed!
				</div>
				<Textarea
					variant='tall-clickable'
					status={selectStatus}
					onClick={selectDir}
					value={projectDir}
					placeholder={placeholder}
					readOnly
				/>
				<div className='dir-prompt-actions'>
					<Button
						onClick={handleConfirm}
						disabled={selectStatus === 'error' || !projectDir}
					>
						confirm
					</Button>
				</div>
			</div>

			<style>
				{`
					.dir-prompt-overlay {
						position: fixed;
						inset: 0;
						background: rgba(0, 0, 0, 0.45);
						display: flex;
						align-items: center;
						justify-content: center;
						z-index: 1000;
					}

					.dir-prompt-window {
						width: 520px;
						max-width: 90vw;
						padding: 24px;
						background: #fff;
						border-radius: var(--action-radius);
						box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
						display: flex;
						flex-direction: column;
						align-items: stretch;
						gap: 12px;
					}

					.dir-prompt-title {
						font-size: 18px;
						font-weight: 600;
						text-align: center;
					}

					.dir-prompt-actions {
						display: flex;
						justify-content: flex-end;
						width: 100%;
					}


				`}
			</style>
		</div>
	);
}