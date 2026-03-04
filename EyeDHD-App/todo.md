# UI / Backend TODO List

## Need to be done now
- Add functionality to the tasks.

## Things / Ideas for later
- More reusable UI components like status symbols (green checkmarks / red xs).
- Estimated time until all tasks complete.
- Preview window for running task on the right of the task list
- Eye dilation chart.
- Saccade chart.
- CSS Styling.
- More complete error checking:
	- If main.db has a selected project folder, on start check if folder is set up correctly and if error and prompt for new folder selection if not
- Case option dialog which will allow exporting case to zip, deleting case, etc.
- Custom title bar.
- Select multiple cases and compare.
- Add ability to switch project folders.
- Keep track of task completion in the CaseData table.

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