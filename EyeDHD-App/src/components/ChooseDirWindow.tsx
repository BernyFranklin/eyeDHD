import React, { useEffect, useState } from 'react';

import { useSelector, useDispatch } from '../store/hooks';
import { showAlert } from '../store/features/global';
import { selectProjectDir, selectProjectInitialized, setProjectDir, setProjectInitialized } from '../store/features/user';
import Button from './Button';

type Props = {
	loading: boolean;
}

type SelectStatus = 'waiting' | 'success' | 'error';

export default function ChooseDirWindow(props: Props) {
	const dispatch = useDispatch();
	const projectDir = useSelector(selectProjectDir);
	const projectInitialized = useSelector(selectProjectInitialized);

	const [selectStatus, setSelectStatus] = useState<SelectStatus>('waiting');
	const [hidden, setHidden] = useState(true);

	const selectDir = async () => {
		try {
			setSelectStatus('waiting');

			const user = await window.electron.user.read();
			const project = await window.electron.user.selectDirectory(user);

			if (!project) {
				setSelectStatus('error');
				return;
			}

			if (project.dir) {
				dispatch(setProjectDir(project.dir));
				setSelectStatus('success');
			}
			dispatch(setProjectInitialized(!!project.status.initialized));
		} catch (err) {
			dispatch(showAlert({
				color: 'red',
				message: `Error selecting directory: ${err.message}` }
			));
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

			if (updatedUser.dir) {
				dispatch(setProjectDir(updatedUser.dir));
			}
			dispatch(setProjectInitialized(!!updatedUser.project_initialized));
			setHidden(true);
		} catch (err) {
			dispatch(showAlert({
				color: 'red',
				message: `Error initializing directory: ${err.message}`
			}));
		}
	};

	const getSelectBorder = (status: SelectStatus) => {
		return `select-${status}`;
	}

	useEffect(() => {
		if (props.loading) {
			return;
		}

		setHidden(!!projectDir && !!projectInitialized);
	}, [props.loading, projectDir, projectInitialized]);

	if (hidden) {
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
				<textarea
					className={
						`project-dir-input ${getSelectBorder(selectStatus)}`
					}
					onClick={selectDir}
					value={projectDir ?? 'Please select a folder'}
					readOnly
				/>
				<div className='dir-prompt-actions'>
					<Button
						onClick={handleConfirm}
						disabled={!projectDir}
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
						border-radius: 12px;
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

					.project-dir-input {
						width: 100%;
						min-height: 80px;
						padding: 10px;
						border-radius: 8px;
						resize: none;
						cursor: pointer;
						align-self: stretch;
						margin: 0;
						box-sizing: border-box;
					}

					.dir-prompt-actions {
						display: flex;
						justify-content: flex-end;
						width: 100%;
					}

					.select-waiting {
						border: 2px solid #7A7A7A;
					}

					.select-success {
						border: 2px solid #00A000;
					}

					.select-error {
						border: 2px solid #B1102B;
					}

					.project-dir-input:focus,
					.project-dir-input:focus-visible {
						outline: none;
						box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
					}
				`}
			</style>
		</div>
	);
}