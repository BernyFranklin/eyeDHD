import { interpolateAt } from './interpolate';
import type {
	NormalizedPoint,
	SegmentDefinition,
	SegmentEpoch,
	SegmentEpochPoint,
	SegmentEpochResult,
} from './types';

export interface ComputeSegmentEpochsOptions {
	preMs: number;
	postMs: number;
	gridStepMs: number;
}

/**
 * For each segment, samples the per-frame normalized series across
 * `[startMs - preMs, endMs + postMs]` on a fixed `gridStepMs` grid, with
 * `timeRelMs = 0` at the segment start. Each segment yields a single epoch
 * (one figure per segment) showing pre / during / post in one frame.
 */
export function computeSegmentEpochs(
	series: ReadonlyArray<NormalizedPoint>,
	segments: ReadonlyArray<SegmentDefinition>,
	options: ComputeSegmentEpochsOptions
): SegmentEpochResult {
	const { preMs, postMs, gridStepMs } = options;
	if (gridStepMs <= 0) throw new Error('gridStepMs must be > 0');
	if (preMs < 0 || postMs < 0) throw new Error('preMs and postMs must be >= 0');

	const epochs: SegmentEpoch[] = segments.map((seg) =>
		buildEpochForSegment(series, seg, preMs, postMs, gridStepMs)
	);

	return { gridStepMs, preMs, postMs, epochs };
}

function buildEpochForSegment(
	series: ReadonlyArray<NormalizedPoint>,
	seg: SegmentDefinition,
	preMs: number,
	postMs: number,
	gridStepMs: number
): SegmentEpoch {
	const durationMs = Math.max(0, seg.endMs - seg.startMs);
	const grid = buildGrid(-preMs, durationMs + postMs, gridStepMs);

	const points: SegmentEpochPoint[] = grid.map((rel) => {
		const tAbs = seg.startMs + rel;
		const value = series.length === 0 ? NaN : interpolateAt(series, tAbs);
		return { timeRelMs: rel, percentChange: value };
	});

	return {
		segmentId: seg.id,
		label: seg.label,
		startMs: seg.startMs,
		endMs: seg.endMs,
		durationMs,
		points,
	};
}

function buildGrid(start: number, end: number, step: number): number[] {
	const grid: number[] = [];
	for (let t = start; t <= end + step * 1e-9; t += step) {
		grid.push(Math.round(t * 1e6) / 1e6);
	}
	return grid;
}
