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

	};

	useEffect(() => {
		if (props.loading) {
			return;
		}

		if (!projectDir) {
			setHidden(false);
		}
	}, [projectDir]);

	return (
		<>
			<div>
				Select the folder you want your project data stored in:
				<textarea
					className='project-dir-input'
					onClick={selectDir}
					value={projectDir ?? 'Select a folder'}
					readOnly
				/>
				<Button buttonText='confirm' onClick={handleConfirm} />
			</div>

			<style>
				{`
					.project-dir-input {
						resize: none;
					}
				`}
			</style>
		</>
	);
}