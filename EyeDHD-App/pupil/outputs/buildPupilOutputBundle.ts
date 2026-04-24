import type { BundleFileDescriptor } from '@viz/export';
import type { BuildFigureRenderSpecOptions, FigureOverlaySpec } from '@viz/render';

import {
	buildEventLockedPupilSpec,
	buildNormalizedPupilSpec,
	buildPupilTimeSeriesSpec,
} from '@pupil/visualization/specs';
import type { PupilOverlaysModel } from '@pupil/visualization/prep/types';

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
		withModelOverlays(specOptions.timeSeries, visualization.overlays)
	);
	const normalizedSpec = buildNormalizedPupilSpec(
		visualization.normalized,
		withModelOverlays(specOptions.normalized, visualization.overlays)
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

/**
 * Merges the model's computed overlays (event markers, segment boundaries)
 * into the caller's spec options. Caller-supplied overlays win on ordering
 * and label conflicts — they're appended first so the computed ones act as
 * a default layer.
 */
function withModelOverlays(
	base: BuildFigureRenderSpecOptions | undefined,
	model: PupilOverlaysModel
): BuildFigureRenderSpecOptions {
	const caller = base?.overlays ?? {};
	const hasModelMarkers = model.markers.length > 0;
	const hasModelBoundaries = model.segmentBoundaries.length > 0;
	if (!hasModelMarkers && !hasModelBoundaries) {
		return base ?? {};
	}
	const merged: FigureOverlaySpec = {
		markers: mergeLists(caller.markers, model.markers),
		segmentBoundaries: mergeLists(caller.segmentBoundaries, model.segmentBoundaries),
	};
	return { ...(base ?? {}), overlays: merged };
}

function mergeLists<T>(
	caller: ReadonlyArray<T> | undefined,
	model: ReadonlyArray<T>
): T[] | undefined {
	if ((!caller || caller.length === 0) && model.length === 0) return undefined;
	return [...(caller ?? []), ...model];
}
