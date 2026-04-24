import type { BundleFileDescriptor } from '@viz/export';
import type { BuildFigureRenderSpecOptions, FigureOverlaySpec } from '@viz/render';

import {
	buildEventLockedEpochSpec,
	buildEventLockedPupilSpec,
	buildNormalizedPupilSpec,
	buildPupilTimeSeriesSpec,
} from '@pupil/visualization/specs';
import type {
	EventLockedEpochModel,
	PupilOverlaysModel,
} from '@pupil/visualization/prep/types';

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

	// Per-event epoch figures: one PNG + one CSV per event, keyed by a slug of
	// the event id so duplicate ids don't collide on disk. Rendered at reduced
	// dimensions by default — recordings with many events otherwise produce
	// dozens of 2400×1800@300 PNGs in a tight sync loop, overwhelming the
	// native canvas encoder.
	const slugs = makeUniqueSlugs(visualization.eventLockedEpochs);
	const epochSpecDefaults: BuildFigureRenderSpecOptions = {
		dimensions: { widthPx: 1200, heightPx: 900, dpi: 150 },
		...(specOptions.eventLockedEpoch ?? {}),
	};
	for (let i = 0; i < visualization.eventLockedEpochs.length; i++) {
		const epoch = visualization.eventLockedEpochs[i];
		const slug = slugs[i];
		const spec = buildEventLockedEpochSpec(epoch, epochSpecDefaults);

		files.push(
			{
				key: `pupilEventLockedEpochModel_${slug}`,
				relativePath: `visuals/event-locked/${slug}.csv`,
				format: 'csv',
				category: CATEGORY_VISUALS,
				optional: true,
				content: epoch.points,
			},
			{
				key: `pupilEventLockedEpochPng_${slug}`,
				relativePath: `visuals/event-locked/${slug}.png`,
				format: 'png',
				category: CATEGORY_VISUALS,
				optional: true,
				content: spec,
			}
		);
	}

	return { caseInfo, runConfig, files };
}

/**
 * Slugifies event ids to be filesystem-safe and disambiguates duplicates by
 * appending `-<index>` starting at the second occurrence.
 */
function makeUniqueSlugs(epochs: ReadonlyArray<EventLockedEpochModel>): string[] {
	const seen = new Map<string, number>();
	const out: string[] = [];
	for (const epoch of epochs) {
		const base = slugify(epoch.eventId);
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		out.push(count === 0 ? base : `${base}-${count + 1}`);
	}
	return out;
}

function slugify(id: string): string {
	const lowered = id.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
	const trimmed = lowered.replace(/^-+|-+$/g, '');
	return trimmed.length > 0 ? trimmed : 'event';
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
