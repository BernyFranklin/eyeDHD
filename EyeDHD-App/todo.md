# UI / Backend TODO List

## Need to be done now
- Convert animation to backend headless animation, switch to ffmpeg-wasm.
- Add functionality to the animate and side-by-side tasks.

## Things / Ideas for later
- Estimated time until all tasks complete.
- Preview window for running task on the right of the task list
- Eye dilation chart.
- Saccade chart.
- CSS Styling.
- More complete error checking:
	- If main.db has a selected project folder, on start check if folder is set up correctly and if not tell user and prompt for new folder selection
- Case option dialog which will allow exporting case to zip, deleting case, etc.
- Custom title bar.
- Add ability to switch project folders (maybe button on navbar).
- Add a clear project option.
- Make Login window a full page and have welcome text.
- Add description text to each page.
- Adjust loading overlay to have an (spinning?) animation using the `images/eyedhd-logo-transparent.png`.
- Show loading animation on app startup.
- Add the app name to the Navbar / Titlebar.
- Add percentage to progress circle.
- Make AlertWindow positionable so it can be used like a speech bubble that points to whatever caused the Alert.
- Select multiple cases and compare.

Project folder example:

```text
path_to_folder/
	project.db (storing list of open cases, progress for each case, etc.)
	settings.json (maybe, user configurations)
	cases/
		ID.011/
			imports/
				ID.011.csv
				ID.011.mp4
				...
			outputs/
				ID.011_Animation.mp4
				ID.011_Cleaned.csv
				ID.011_SideBySide.mp4
				graphs/
					ID.011_Saccades.png
				...
		ID.005/
			...
		...
...
```