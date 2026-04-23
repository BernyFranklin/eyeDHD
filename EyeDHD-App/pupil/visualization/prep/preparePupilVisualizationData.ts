import type { PupilMetricsResult, PupilEvent } from '@pupil/metrics/types';

import { pickTimeUnit, scaleTime } from './timeAxis';
import type {
	EventLockedPupilModel,
	NormalizedPupilModel,
	PupilOverlaysModel,
	PupilTimeAxisModel,
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

	const samples = metrics.samples;
	const t0Ms = samples.length > 0 ? samples[0].timeMs : 0;
	const tEndMs = samples.length > 0 ? samples[samples.length - 1].timeMs : t0Ms;
	const durationMs = Math.max(0, tEndMs - t0Ms);
	const unit = pickTimeUnit(durationMs);

	const timeAxis: PupilTimeAxisModel = { unit, t0Ms, durationMs };

	const timeSeries: PupilTimeSeriesModel = {
		unit,
		points: samples.map((s) => ({
			t: scaleTime(s.timeMs - t0Ms, unit),
			valueMm: s.valueMm,
		})),
	};

	const normalized: NormalizedPupilModel = {
		unit,
		points: metrics.perFrame
			.filter((p) => Number.isFinite(p.percentChange))
			.map((p) => ({
				t: scaleTime(p.timeMs - t0Ms, unit),
				percentChange: p.percentChange,
			})),
	};

	const epochSpanMs =
		metrics.eventLocked.preMs + metrics.eventLocked.postMs;
	const eventLockedUnit = pickTimeUnit(epochSpanMs);

	const eventLocked: EventLockedPupilModel = {
		unit: eventLockedUnit,
		gridStepMs: metrics.eventLocked.gridStepMs,
		preMs: metrics.eventLocked.preMs,
		postMs: metrics.eventLocked.postMs,
		points: metrics.eventLocked.average.map((a) => ({
			t: scaleTime(a.timeRelMs, eventLockedUnit),
			meanPercent: a.meanPercent,
			sePercent: a.sePercent,
			n: a.n,
		})),
	};

	const overlays: PupilOverlaysModel = {
		markers: events.map((e) => ({
			timeMs: scaleTime(e.timeMs - t0Ms, unit),
			label: e.label ?? e.id,
			kind: e.kind ?? 'event',
		})),
		segmentBoundaries: segments.flatMap((seg) => [
			{ timeMs: scaleTime(seg.startMs - t0Ms, unit), label: `${seg.id} start` },
			{ timeMs: scaleTime(seg.endMs - t0Ms, unit), label: `${seg.id} end` },
		]),
	};

	return { timeAxis, timeSeries, normalized, eventLocked, overlays };
}
