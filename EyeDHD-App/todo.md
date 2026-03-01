# UI Rework TODO List

## More Important
- Add functionality to the tasks
- Case option dialog which will allow exporting case to zip, deleting case, etc.

## Less Important
- Work on eye dilation chart
- CSS Styling

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