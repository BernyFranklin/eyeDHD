import React, { useEffect, useState } from 'react';

import { useSelector, useDispatch } from '../store/hooks';
import { selectProjectDir, setProjectDir } from '../store/features/user';
import Button from './Button';

// This will be a floating window that prompts the user to select a directory for storing project data. It will be rendered on top of the home page until a directory is selected and the user confirms their selection, at which point it will disappear. The user will click on the textarea to select a folder, and the confirm button will close the window. The window starts hidden and will only render if their is no projectDir loaded, it will wait until props.loading is done otherwise projectDir's value won't be accurate

type Props = {
	loading: boolean;
}

export default function DirPrompt(props: Props) {
	const dispatch = useDispatch();
	const projectDir = useSelector(selectProjectDir);

	const [hidden, setHidden] = useState(true);
	const [hasCheckedInitial, setHasCheckedInitial] = useState(false);

	const selectDir = async () => {
		try {
			let user = await window.electron.user.read();
			user = await window.electron.user.selectDirectory(user);

			dispatch(setProjectDir(user.dir));
		} catch (err) {
			// Switch to alert window
			console.error('Error selecting directory:', err);
		}
	}

	const handleConfirm = () => {
		if (projectDir) {
			setHidden(true);
		}
	};

	useEffect(() => {
		if (props.loading || hasCheckedInitial) {
			return;
		}

		setHidden(!!projectDir);
		setHasCheckedInitial(true);
	}, [projectDir, props.loading, hasCheckedInitial]);

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
					className='project-dir-input'
					onClick={selectDir}
					value={projectDir ?? 'Please select a folder'}
					readOnly
				/>
				<div className='dir-prompt-actions'>
					<Button buttonText='confirm' onClick={handleConfirm} />
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
						border: 1px solid #444;
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
				`}
			</style>
		</div>
	);
}