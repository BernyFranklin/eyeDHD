import type { BundleFileDescriptor } from '@viz/export';

import {
	buildEventLockedPupilSpec,
	buildNormalizedPupilSpec,
	buildPupilTimeSeriesSpec,
} from '@pupil/visualization/specs';

import type {
	PupilOutputBundle,
	PupilOutputBundleInput,
} from './types';

const CATEGORY_METADATA = 'metadata';
const CATEGORY_ANALYSIS = 'analysis';
const CATEGORY_VISUALS = 'visuals';

export function buildPupilOutputBundle(
	input: PupilOutputBundleInput
): PupilOutputBundle {
	const { caseInfo, runConfig, metrics, visualization } = input;
	const specOptions = input.specOptions ?? {};

	const timeSeriesSpec = buildPupilTimeSeriesSpec(
		visualization.timeSeries,
		specOptions.timeSeries
	);
	const normalizedSpec = buildNormalizedPupilSpec(
		visualization.normalized,
		specOptions.normalized
	);
	const eventLockedSpec = buildEventLockedPupilSpec(
		visualization.eventLocked,
		specOptions.eventLocked
	);

	const files: BundleFileDescriptor[] = [
		{
			key: 'pupilRunConfig',
			relativePath: 'metadata/pupil-run-config.json',
			format: 'json',
			category: CATEGORY_METADATA,
			optional: false,
			content: { caseInfo, runConfig },
		},

		// Per-frame and per-event analysis tables
		{
			key: 'pupilPerFrame',
			relativePath: 'analysis/pupil-per-frame.csv',
			format: 'csv',
			category: CATEGORY_ANALYSIS,
			optional: false,
			content: metrics.perFrameRows,
		},
		{
			key: 'pupilPerEvent',
			relativePath: 'analysis/pupil-per-event.csv',
			format: 'csv',
			category: CATEGORY_ANALYSIS,
			optional: true,
			content: metrics.perEventRows,
		},

		// Visualization model CSVs (one per figure, alongside the rendered PNG)
		{
			key: 'pupilTimeSeriesModel',
			relativePath: 'visuals/pupil-timeseries-model.csv',
			format: 'csv',
			category: CATEGORY_VISUALS,
			optional: false,
			content: visualization.timeSeries.points,
		},
		{
			key: 'pupilNormalizedModel',
			relativePath: 'visuals/pupil-normalized-model.csv',
			format: 'csv',
			category: CATEGORY_VISUALS,
			optional: false,
			content: visualization.normalized.points,
		},
		{
			key: 'pupilEventLockedModel',
			relativePath: 'visuals/pupil-event-locked-model.csv',
			format: 'csv',
			category: CATEGORY_VISUALS,
			optional: true,
			content: visualization.eventLocked.points,
		},

		// PNGs — `content` is the FigureRenderSpec; @viz/export.writeBundle
		// renders it through the supplied PNG backend at write time.
		{
			key: 'pupilTimeSeriesPng',
			relativePath: 'visuals/pupil-timeseries.png',
			format: 'png',
			category: CATEGORY_VISUALS,
			optional: false,
			content: timeSeriesSpec,
		},
		{
			key: 'pupilNormalizedPng',
			relativePath: 'visuals/pupil-normalized.png',
			format: 'png',
			category: CATEGORY_VISUALS,
			optional: false,
			content: normalizedSpec,
		},
		{
			key: 'pupilEventLockedPng',
			relativePath: 'visuals/pupil-event-locked.png',
			format: 'png',
			category: CATEGORY_VISUALS,
			optional: true,
			content: eventLockedSpec,
		},
	];

	return { caseInfo, runConfig, files };
}
