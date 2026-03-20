import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button, Textarea } from '@src/components';
import { AlertControls } from '@src/components/AlertWindow';

import { useSelector, useDispatch } from '@src/data/hooks';
import { disableButtons, enableButtons, selectLoading } from '@src/data/features/global';
import { selectProjectDir, selectProjectInitialized, setProjectDir, setProjectInitialized } from '@src/data/features/user';

import { ToolTip } from '@src/components/extra/ToolTip/ToolTip';

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

	const canContinue = Boolean(projectDir && projectInitialized);
	const confirmLabel = canContinue ? 'continue' : 'confirm';

	useEffect(() => {
		dispatch(disableButtons());

		return () => {
			dispatch(enableButtons());
		};
	}, [dispatch]);

	useEffect(() => {
		if (canContinue) {
			setSelectStatus('success');
		}
	}, [canContinue]);

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
			AlertControls.error(`Error selecting directory: ${err.message}`);
		}
	}

	const handleConfirm = async () => {
		if (canContinue) {
			navigate('/home');
			return;
		}

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

			if (updatedUser.project_initialized) {
				navigate('/home');
			}
		} catch (err) {
			AlertControls.error(`Error initializing directory: ${err.message}`);
		}
	};

	if (loading) {
		return null;
	}

	return (
		<div className='login-page' role='main' aria-label='Select project directory'>
			<div className='login-column left'>
				<div className='dir-prompt-window' role='dialog' aria-modal='true'>
					<div className='dir-prompt-title'>
						{canContinue ? 'Folder selected' : 'Project folder needed!'}
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
						<ToolTip text="Click to continue after selecting a folder">
							<Button
								onClick={handleConfirm}
								disabled={!canContinue && (selectStatus === 'error' || !projectDir)}>
								{confirmLabel}
							</Button>
						</ToolTip>
					</div>
				</div>
			</div>

			<div className='login-column right'>
				<div className='login-welcome'>
					<Textarea
						className='login-welcome-textarea'
						variant='tall-static'
						value={`
							Welcome to EyeDHD.

							This is a short introduction area for your app. You can replace this paragraph with a richer overview, quick start steps, or helpful tips for first-time users.
						`.trim()}
						readOnly
					/>
				</div>
			</div>

			<style>
				{`
					.login-page {
						position: fixed;
						top: var(--navbar-height, 0px);
						left: 0;
						right: 0;
						bottom: 0;
						height: calc(100vh - var(--navbar-height, 0px));
						display: flex;
						align-items: stretch;
						background: #f5f5f5;
						overflow: hidden;
						box-sizing: border-box;
					}

					.login-column {
						display: flex;
						justify-content: center;
						padding: 24px;
						height: 100%;
						min-height: 0;
						box-sizing: border-box;
					}

					.login-column.left {
						flex: 1;
						justify-content: flex-start;
						padding-left: 100px;
						margin-top: 22px;
					}

					.dir-prompt-window {
						width: 100%;
						max-width: 520px;
						padding: 24px;
						background: transparent;
						border-radius: 0;
						box-shadow: none;
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

					.login-column.right {
						flex: 2;
						justify-content: center;
						align-items: center;
						overflow: hidden;
					}

					.login-welcome {
						width: 80%;
						height: 80%;
						max-width: 100%;
						max-height: 100%;
						display: flex;
						align-items: center;
						justify-content: center;
						box-sizing: border-box;
					}

					.login-welcome-textarea {
						width: 100%;
						height: 100%;
						max-height: 100%;
						max-width: 100%;
						min-height: 0;
						box-sizing: border-box;
						text-align: center;
						text-align-vertical: center;
						font-size: 32px;
						color: #333;
						line-height: 1.5;
					}
				`}
			</style>
		</div>
	);
}