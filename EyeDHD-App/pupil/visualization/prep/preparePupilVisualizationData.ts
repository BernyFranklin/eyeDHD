import type { PupilMetricsResult, PupilEvent } from '@pupil/metrics/types';

import { pickTimeUnit, scaleTime } from './timeAxis';
import type {
	EventLockedPupilModel,
	NormalizedPupilModel,
	PupilOverlaysModel,
	PupilTimeAxisModel,
	PupilTimeSeriesModel,
	PupilVisualizationModels,
	SegmentEpochVizModel,
} from './types';

export interface SegmentDefinition {
	id: string;
	startMs: number;
	endMs: number;
	label?: string;
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

	const scaleTs = (ms: number) => scaleTime(ms - t0Ms, unit);

	const timeSeries: PupilTimeSeriesModel = {
		unit,
		points: samples.map((s) => ({ t: scaleTs(s.timeMs), valueMm: s.valueMm })),
		leftPoints: metrics.samplesLeft?.map((s) => ({
			t: scaleTs(s.timeMs),
			valueMm: s.valueMm,
		})),
		rightPoints: metrics.samplesRight?.map((s) => ({
			t: scaleTs(s.timeMs),
			valueMm: s.valueMm,
		})),
	};

	const normalized: NormalizedPupilModel = {
		unit,
		points: metrics.perFrame
			.filter((p) => Number.isFinite(p.percentChange))
			.map((p) => ({ t: scaleTs(p.timeMs), percentChange: p.percentChange })),
		leftPoints: metrics.perFrameLeft
			?.filter((p) => Number.isFinite(p.percentChange))
			.map((p) => ({ t: scaleTs(p.timeMs), percentChange: p.percentChange })),
		rightPoints: metrics.perFrameRight
			?.filter((p) => Number.isFinite(p.percentChange))
			.map((p) => ({ t: scaleTs(p.timeMs), percentChange: p.percentChange })),
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

	// Pick a single time unit shared across all per-segment figures, sized for
	// the longest segment span (pre + duration + post). One unit keeps the
	// figures visually comparable and prevents 30s-vs-min flips between cases.
	const segmentSpansMs = metrics.segmentEpochs.epochs.map(
		(e) => metrics.segmentEpochs.preMs + e.durationMs + metrics.segmentEpochs.postMs
	);
	const longestSegmentSpanMs = segmentSpansMs.length > 0 ? Math.max(...segmentSpansMs) : 0;
	const segmentUnit = pickTimeUnit(longestSegmentSpanMs);

	const segmentEpochs: SegmentEpochVizModel[] = metrics.segmentEpochs.epochs.map(
		(epoch) => ({
			unit: segmentUnit,
			segmentId: epoch.segmentId,
			label: epoch.label ?? epoch.segmentId,
			startMs: epoch.startMs,
			endMs: epoch.endMs,
			segmentDurationScaled: scaleTime(epoch.durationMs, segmentUnit),
			points: epoch.points.map((p) => ({
				t: scaleTime(p.timeRelMs, segmentUnit),
				percentChange: p.percentChange,
			})),
		})
	);

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

	return {
		timeAxis,
		timeSeries,
		normalized,
		eventLocked,
		segmentEpochs,
		overlays,
	};
}
