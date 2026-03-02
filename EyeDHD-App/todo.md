# UI / Backend TODO List

## Need to be done now
- Simplify cleaned csv streaming so that it reads from the saved _Cleaned.csv file.
- Refactor saving cleaned data to a file and reading cleaned data from that file by. looping line by line splitting on commas and converting to CSVData objects.
- Add functionality to the tasks.

## Things / Ideas for later
- Reusable UI components like progress wheels, status symbols like green checkmarks / red xs.
- Estimated time until all tasks complete.
- Preview window for running task on the right of the task list
- Eye dilation chart.
- Saccade chart.
- CSS Styling.
- More complete error checking:
	- If main.db has a selected project folder, on start check if folder is set up correctly and if error and prompt for new folder selection
- Case option dialog which will allow exporting case to zip, deleting case, etc.
- Custom title bar.
- Select multiple cases and compare.

Project folder example:

```text
path_to_folder/
	project.db (storing list of open cases, progress for each case, etc.)
	settings.json (maybe, user configurations)
	cases/
		ID_011/
			imports/
				ID_011.csv
				ID_011.mp4
				...
			outputs/
				ID_011_Animation.mp4
				ID_011_Cleaned.csv
				ID_011_SideBySide.mp4
				graphs/
					ID_011_Saccades.png
				...
		ID_005/
			...
		.../
.../
```