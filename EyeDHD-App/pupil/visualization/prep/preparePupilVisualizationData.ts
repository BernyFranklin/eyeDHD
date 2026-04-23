import type { PupilMetricsResult, PupilEvent } from '@pupil/metrics/types';

import type {
	EventLockedPupilModel,
	NormalizedPupilModel,
	PupilOverlaysModel,
	PupilTimeSeriesModel,
	PupilVisualizationModels,
} from './types';

export interface SegmentDefinition {
	id: string;
	startMs: number;
	endMs: number;
}

export interface PreparePupilVisualizationDataInput {
	metrics: PupilMetricsResult;
	segments?: ReadonlyArray<SegmentDefinition>;
	events?: ReadonlyArray<PupilEvent>;
}

export function preparePupilVisualizationData(
	input: PreparePupilVisualizationDataInput
): PupilVisualizationModels {
	const { metrics } = input;
	const segments = input.segments ?? [];
	const events = input.events ?? [];

	const timeSeries: PupilTimeSeriesModel = {
		points: metrics.samples.map((s) => ({ timeMs: s.timeMs, valueMm: s.valueMm })),
	};

	const normalized: NormalizedPupilModel = {
		points: metrics.perFrame
			.filter((p) => Number.isFinite(p.percentChange))
			.map((p) => ({ timeMs: p.timeMs, percentChange: p.percentChange })),
	};

	const eventLocked: EventLockedPupilModel = {
		gridStepMs: metrics.eventLocked.gridStepMs,
		preMs: metrics.eventLocked.preMs,
		postMs: metrics.eventLocked.postMs,
		points: metrics.eventLocked.average.map((a) => ({
			timeRelMs: a.timeRelMs,
			meanPercent: a.meanPercent,
			sePercent: a.sePercent,
			n: a.n,
		})),
	};

	const overlays: PupilOverlaysModel = {
		markers: events.map((e) => ({
			timeMs: e.timeMs,
			label: e.label ?? e.id,
			kind: e.kind ?? 'event',
		})),
		segmentBoundaries: segments.flatMap((seg) => [
			{ timeMs: seg.startMs, label: `${seg.id} start` },
			{ timeMs: seg.endMs, label: `${seg.id} end` },
		]),
	};

	return { timeSeries, normalized, eventLocked, overlays };
}
