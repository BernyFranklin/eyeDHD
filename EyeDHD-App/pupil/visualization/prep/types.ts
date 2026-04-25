import type { MarkerOverlaySpec, SegmentBoundaryOverlaySpec } from '@viz/render';

import type { TimeUnit } from './timeAxis';

/** Axis metadata shared by time-series and normalized figures. */
export interface PupilTimeAxisModel {
	unit: TimeUnit;
	t0Ms: number;
	durationMs: number;
}

/** Mean pupil diameter (mm) over time. `t` is already scaled to `unit`. */
export interface PupilTimeSeriesModel {
	unit: TimeUnit;
	/** Combined/mean series (always present). */
	points: Array<{ t: number; valueMm: number }>;
	/** Optional per-eye series — only set when eye selection is 'mean'. */
	leftPoints?: Array<{ t: number; valueMm: number }>;
	rightPoints?: Array<{ t: number; valueMm: number }>;
}

/** Per-frame % change relative to the rolling baseline. */
export interface NormalizedPupilModel {
	unit: TimeUnit;
	/** Combined/mean series (always present). */
	points: Array<{ t: number; percentChange: number }>;
	/** Optional per-eye series — only set when eye selection is 'mean'. */
	leftPoints?: Array<{ t: number; percentChange: number }>;
	rightPoints?: Array<{ t: number; percentChange: number }>;
}

/** Across-events grand mean ± SE on a common epoch grid. */
export interface EventLockedPupilModel {
	unit: TimeUnit;
	gridStepMs: number;
	preMs: number;
	postMs: number;
	points: Array<{
		t: number;
		meanPercent: number;
		sePercent: number;
		n: number;
	}>;
}

/**
 * One per-segment epoch (one figure per segment) showing pre / during / post.
 * `t` is scaled to `unit`; `segmentDurationScaled` is the x-position of the
 * segment-end vertical reference (start is always at t = 0).
 */
export interface SegmentEpochVizModel {
	unit: TimeUnit;
	segmentId: string;
	label: string;
	startMs: number;
	endMs: number;
	segmentDurationScaled: number;
	points: Array<{ t: number; percentChange: number }>;
}

/** Overlays applied to time-axis figures (segments and event markers). */
export interface PupilOverlaysModel {
	markers: MarkerOverlaySpec[];
	segmentBoundaries: SegmentBoundaryOverlaySpec[];
}

export interface PupilVisualizationModels {
	timeAxis: PupilTimeAxisModel;
	timeSeries: PupilTimeSeriesModel;
	normalized: NormalizedPupilModel;
	eventLocked: EventLockedPupilModel;
	/** One entry per segment; used to render one PNG per segment. */
	segmentEpochs: SegmentEpochVizModel[];
	overlays: PupilOverlaysModel;
}
