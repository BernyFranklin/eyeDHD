import type { MarkerOverlaySpec, SegmentBoundaryOverlaySpec } from '@viz/render';

/** Mean pupil diameter (mm) over time. */
export interface PupilTimeSeriesModel {
	points: Array<{ timeMs: number; valueMm: number }>;
}

/** Per-frame % change relative to the rolling baseline. */
export interface NormalizedPupilModel {
	points: Array<{ timeMs: number; percentChange: number }>;
}

/** Across-events grand mean ± SE on a common epoch grid. */
export interface EventLockedPupilModel {
	gridStepMs: number;
	preMs: number;
	postMs: number;
	points: Array<{
		timeRelMs: number;
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
	timeSeries: PupilTimeSeriesModel;
	normalized: NormalizedPupilModel;
	eventLocked: EventLockedPupilModel;
	overlays: PupilOverlaysModel;
}
