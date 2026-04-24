import type { RawPupilRow } from '@pupil/ingest/csv/types';
import type { BaselinePoint, BaselineSample } from '@pupil/core/baseline';

/** A user-defined event marker that anchors an ERP epoch. */
export interface PupilEvent {
	id: string;
	timeMs: number;
	/** Free-form classification ('segment_start', 'segment_end', 'event', ...). */
	kind?: string;
	label?: string;
}

/** A single point on the per-frame normalized series. */
export interface NormalizedPoint {
	timeMs: number;
	valueMm: number;
	baselineMm: number;
	/** (value - baseline) / baseline * 100. */
	percentChange: number;
}

export interface EventEpochPoint {
	timeRelMs: number;
	percentChange: number;
}

export interface EventEpoch {
	eventId: string;
	kind?: string;
	label?: string;
	eventTimeMs: number;
	points: EventEpochPoint[];
}

export interface EventLockedAveragePoint {
	timeRelMs: number;
	meanPercent: number;
	/** Standard error across contributing epochs at this grid point. */
	sePercent: number;
	/** Number of epochs that contributed a finite sample at this grid point. */
	n: number;
}

export interface EventLockedResult {
	gridStepMs: number;
	preMs: number;
	postMs: number;
	epochs: EventEpoch[];
	average: EventLockedAveragePoint[];
}

export interface PerFramePupilRow {
	timeMs: number;
	leftMm: number | null;
	rightMm: number | null;
	valueMm: number;
	baselineMm: number;
	percentChange: number;
}

export interface PerEventPupilRow {
	eventId: string;
	kind: string;
	timeMs: number;
	baselineMm: number;
	peakPercent: number;
	peakLatencyMs: number;
	sampleCount: number;
}

export interface PupilMetricsInput {
	rows: ReadonlyArray<RawPupilRow>;
	events: ReadonlyArray<PupilEvent>;
}

export interface PupilMetricsResult {
	/** Reduced per-frame samples after applying the eye selection. */
	samples: BaselineSample[];
	baseline: BaselinePoint[];
	/** Per-frame series with raw, baseline, and % change. */
	perFrame: NormalizedPoint[];
	eventLocked: EventLockedResult;
	/** Tabular forms suitable for direct CSV serialization. */
	perFrameRows: PerFramePupilRow[];
	perEventRows: PerEventPupilRow[];
	/**
	 * Per-eye samples and normalized series, each with its own rolling baseline.
	 * Only populated when eye selection is 'mean' so the visualization layer can
	 * draw left/right alongside the combined series. Undefined otherwise.
	 */
	samplesLeft?: BaselineSample[];
	samplesRight?: BaselineSample[];
	perFrameLeft?: NormalizedPoint[];
	perFrameRight?: NormalizedPoint[];
}
