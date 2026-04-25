import { DEFAULT_PUPIL_OPTIONS, type EyeSelection, type PupilAnalysisOptions } from '@pupil/core/schema';
import { computeRollingBaseline, type BaselineSample } from '@pupil/core/baseline';
import type { RawPupilRow } from '@pupil/ingest/csv/types';

import { computePercentChange } from './normalization';
import { computeEventLocked } from './eventLocked';
import { computeSegmentEpochs } from './segmentEpoch';
import type {
	EventEpoch,
	NormalizedPoint,
	PerEventPupilRow,
	PerFramePupilRow,
	PupilEvent,
	PupilMetricsInput,
	PupilMetricsResult,
} from './types';

export * from './types';
export { computePercentChange } from './normalization';
export { computeEventLocked } from './eventLocked';
export { computeSegmentEpochs } from './segmentEpoch';

export interface ComputePupilMetricsOptions extends Partial<PupilAnalysisOptions> {
	/** Time grid step (ms) used to resample event epochs. Defaults to 5 ms (200 Hz). */
	gridStepMs?: number;
}

const DEFAULT_GRID_STEP_MS = 5;

export function computePupilMetrics(
	input: PupilMetricsInput,
	options: ComputePupilMetricsOptions = {}
): PupilMetricsResult {
	const opts: PupilAnalysisOptions = { ...DEFAULT_PUPIL_OPTIONS, ...options };
	const gridStepMs = options.gridStepMs ?? DEFAULT_GRID_STEP_MS;

	const samples = reduceRowsToSamples(input.rows, opts.eye);

	const baseline = computeRollingBaseline(samples, {
		windowMs: opts.baselineWindowMs,
		percentile: opts.baselinePercentile,
	});

	const perFrame = computePercentChange(samples, baseline);

	const eventLocked = computeEventLocked(perFrame, input.events, {
		preMs: opts.epochPreMs,
		postMs: opts.epochPostMs,
		gridStepMs,
	});

	const segmentEpochs = computeSegmentEpochs(perFrame, input.segments ?? [], {
		preMs: opts.epochPreMs,
		postMs: opts.epochPostMs,
		gridStepMs,
	});

	const perFrameRows = buildPerFrameRows(input.rows, samples, perFrame, opts.eye);
	const perEventRows = buildPerEventRows(eventLocked.epochs, baseline, samples);

	// When the user selected 'mean', also compute per-eye samples and normalized
	// series so the visualization layer can draw left/right alongside the mean.
	// Each eye gets its own rolling baseline to keep the % change meaningful
	// even when the two eyes differ in absolute diameter.
	let samplesLeft: BaselineSample[] | undefined;
	let samplesRight: BaselineSample[] | undefined;
	let perFrameLeft: NormalizedPoint[] | undefined;
	let perFrameRight: NormalizedPoint[] | undefined;
	if (opts.eye === 'mean') {
		samplesLeft = reduceRowsToSamples(input.rows, 'left');
		samplesRight = reduceRowsToSamples(input.rows, 'right');
		const baselineLeft = computeRollingBaseline(samplesLeft, {
			windowMs: opts.baselineWindowMs,
			percentile: opts.baselinePercentile,
		});
		const baselineRight = computeRollingBaseline(samplesRight, {
			windowMs: opts.baselineWindowMs,
			percentile: opts.baselinePercentile,
		});
		perFrameLeft = computePercentChange(samplesLeft, baselineLeft);
		perFrameRight = computePercentChange(samplesRight, baselineRight);
	}

	return {
		samples,
		baseline,
		perFrame,
		eventLocked,
		segmentEpochs,
		perFrameRows,
		perEventRows,
		samplesLeft,
		samplesRight,
		perFrameLeft,
		perFrameRight,
	};
}

function reduceRowsToSamples(
	rows: ReadonlyArray<RawPupilRow>,
	eye: EyeSelection
): BaselineSample[] {
	const out: BaselineSample[] = [];
	for (const row of rows) {
		const v = pickEyeValue(row, eye);
		if (v === null) continue;
		out.push({ timeMs: row.timeMs, valueMm: v });
	}
	return out;
}

function pickEyeValue(row: RawPupilRow, eye: EyeSelection): number | null {
	if (eye === 'left') return row.leftMm;
	if (eye === 'right') return row.rightMm;
	// 'mean': average when both present, else fall back to whichever is.
	if (row.leftMm !== null && row.rightMm !== null) {
		return (row.leftMm + row.rightMm) / 2;
	}
	return row.leftMm ?? row.rightMm;
}

function buildPerFrameRows(
	rows: ReadonlyArray<RawPupilRow>,
	samples: ReadonlyArray<BaselineSample>,
	perFrame: ReadonlyArray<NormalizedPoint>,
	eye: EyeSelection
): PerFramePupilRow[] {
	// `samples` is a strict subsequence of `rows` (rows where the chosen eye
	// produced a value). Walk both in tandem, matching by timeMs.
	const out: PerFramePupilRow[] = [];
	let s = 0;
	for (const row of rows) {
		if (s >= samples.length) break;
		if (samples[s].timeMs !== row.timeMs) continue;
		const np = perFrame[s];
		out.push({
			timeMs: row.timeMs,
			leftMm: row.leftMm,
			rightMm: row.rightMm,
			valueMm: np.valueMm,
			baselineMm: np.baselineMm,
			percentChange: np.percentChange,
		});
		s++;
	}
	// Suppress unused-param lint in case `eye` becomes meaningful later.
	void eye;
	return out;
}

function buildPerEventRows(
	epochs: ReadonlyArray<EventEpoch>,
	baseline: ReadonlyArray<{ timeMs: number; baselineMm: number }>,
	samples: ReadonlyArray<BaselineSample>
): PerEventPupilRow[] {
	return epochs.map((epoch) => {
		let peakPercent = NaN;
		let peakLatencyMs = NaN;
		let sampleCount = 0;
		for (const p of epoch.points) {
			if (!Number.isFinite(p.percentChange)) continue;
			sampleCount++;
			if (!Number.isFinite(peakPercent) || Math.abs(p.percentChange) > Math.abs(peakPercent)) {
				peakPercent = p.percentChange;
				peakLatencyMs = p.timeRelMs;
			}
		}
		const baselineMm = nearestBaselineAt(baseline, samples, epoch.eventTimeMs);
		return {
			eventId: epoch.eventId,
			kind: epoch.kind ?? '',
			timeMs: epoch.eventTimeMs,
			baselineMm,
			peakPercent,
			peakLatencyMs,
			sampleCount,
		};
	});
}

function nearestBaselineAt(
	baseline: ReadonlyArray<{ timeMs: number; baselineMm: number }>,
	samples: ReadonlyArray<BaselineSample>,
	t: number
): number {
	if (baseline.length === 0 || samples.length === 0) return NaN;
	// baseline is aligned to samples; binary-search by sample timeMs.
	let lo = 0;
	let hi = samples.length - 1;
	if (t <= samples[0].timeMs) return baseline[0].baselineMm;
	if (t >= samples[hi].timeMs) return baseline[hi].baselineMm;
	while (lo + 1 < hi) {
		const mid = (lo + hi) >>> 1;
		if (samples[mid].timeMs <= t) lo = mid;
		else hi = mid;
	}
	const dLo = Math.abs(samples[lo].timeMs - t);
	const dHi = Math.abs(samples[hi].timeMs - t);
	return dLo <= dHi ? baseline[lo].baselineMm : baseline[hi].baselineMm;
}
