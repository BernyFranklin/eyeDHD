# UI Rework TODO List

## More Important
- Simplify cleaned csv streaming so that it reads from the saved _Cleaned.csv file
- Refactor saving cleaned data to a file and reading cleaned data from that file by looping line by line splitting on commas and converting to CSVData objects
- If main.db has a selected project folder, on start check if folder is set up correctly and if error and prompt for new folder selection
- When case name is entered / csv chosen, check whether that case has been created already
- Add functionality to the tasks
- Progress bars / wheels and estimated time for tasks

## Less Important
- Preview window for running task on the right of the task list
- Work on eye dilation chart
- CSS Styling
- Case option dialog which will allow exporting case to zip, deleting case, etc.

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