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

/** A single event's epoch on the common grid (one figure per event). */
export interface EventLockedEpochModel {
	unit: TimeUnit;
	eventId: string;
	/** Free-form classification carried through from the source PupilEvent. */
	kind?: string;
	/** Display label — prefers PupilEvent.label, falls back to eventId. */
	label: string;
	eventTimeMs: number;
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
	/** One entry per event; used to render one PNG per event. */
	eventLockedEpochs: EventLockedEpochModel[];
	overlays: PupilOverlaysModel;
}
