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
	points: Array<{ t: number; valueMm: number }>;
}

/** Per-frame % change relative to the rolling baseline. */
export interface NormalizedPupilModel {
	unit: TimeUnit;
	points: Array<{ t: number; percentChange: number }>;
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
	overlays: PupilOverlaysModel;
}
