import { describe, expect, it } from 'vitest';

import { computeSegmentEpochs } from '@pupil/metrics/segmentEpoch';
import type { NormalizedPoint } from '@pupil/metrics/types';

function linearSeries(start: number, end: number, stepMs: number): NormalizedPoint[] {
	const out: NormalizedPoint[] = [];
	for (let t = start; t <= end; t += stepMs) {
		out.push({ timeMs: t, valueMm: 0, baselineMm: 0, percentChange: t });
	}
	return out;
}

describe('computeSegmentEpochs', () => {
	it('builds one epoch per segment spanning [-preMs, durationMs + postMs]', () => {
		const series = linearSeries(0, 10_000, 50);
		const result = computeSegmentEpochs(
			series,
			[
				{ id: 'seg-a', startMs: 1_000, endMs: 3_000 },
				{ id: 'seg-b', startMs: 5_000, endMs: 5_500 },
			],
			{ preMs: 500, postMs: 1_000, gridStepMs: 100 }
		);

		expect(result.epochs).toHaveLength(2);
		const a = result.epochs[0];
		expect(a.segmentId).toBe('seg-a');
		expect(a.durationMs).toBe(2_000);
		expect(a.points[0].timeRelMs).toBe(-500);
		expect(a.points[a.points.length - 1].timeRelMs).toBe(3_000);

		const b = result.epochs[1];
		expect(b.durationMs).toBe(500);
		expect(b.points[0].timeRelMs).toBe(-500);
		expect(b.points[b.points.length - 1].timeRelMs).toBe(1_500);
	});

	it('aligns the grid to gridStepMs from the segment start', () => {
		const series = linearSeries(0, 5_000, 10);
		const result = computeSegmentEpochs(
			series,
			[{ id: 's', startMs: 1_000, endMs: 1_400 }],
			{ preMs: 200, postMs: 200, gridStepMs: 100 }
		);
		const rels = result.epochs[0].points.map((p) => p.timeRelMs);
		expect(rels).toEqual([-200, -100, 0, 100, 200, 300, 400, 500, 600]);
	});

	it('linearly interpolates from the per-frame series at segment-relative times', () => {
		// percentChange = absolute timeMs (linear), so interpolated values equal absolute time.
		const series = linearSeries(0, 5_000, 50);
		const result = computeSegmentEpochs(
			series,
			[{ id: 's', startMs: 1_000, endMs: 1_500 }],
			{ preMs: 200, postMs: 200, gridStepMs: 100 }
		);
		// At rel=-200, absolute time=800 -> percentChange=800. At rel=0 -> 1000. etc.
		const expectedAbs = [800, 900, 1_000, 1_100, 1_200, 1_300, 1_400, 1_500, 1_600, 1_700];
		expect(result.epochs[0].points.map((p) => p.percentChange)).toEqual(expectedAbs);
	});

	it('returns NaN where the requested time falls outside the series range', () => {
		const series = linearSeries(1_000, 2_000, 50);
		const result = computeSegmentEpochs(
			series,
			[{ id: 's', startMs: 500, endMs: 2_500 }],
			{ preMs: 100, postMs: 100, gridStepMs: 100 }
		);
		const points = result.epochs[0].points;
		// Pre-window (rel < 500 absolute time) is out of range.
		expect(points.find((p) => p.timeRelMs === -100)?.percentChange).toBeNaN();
		// Post-window past 2000 is out of range.
		expect(points.find((p) => p.timeRelMs === 2_100)?.percentChange).toBeNaN();
		// Inside range stays finite.
		expect(points.find((p) => p.timeRelMs === 500)?.percentChange).toBe(1_000);
	});

	it('throws when gridStepMs <= 0 or pre/post are negative', () => {
		expect(() =>
			computeSegmentEpochs([], [], { preMs: 0, postMs: 0, gridStepMs: 0 })
		).toThrow();
		expect(() =>
			computeSegmentEpochs([], [], { preMs: -1, postMs: 0, gridStepMs: 10 })
		).toThrow();
	});

	it('produces an empty epochs array when no segments are provided', () => {
		const series = linearSeries(0, 1_000, 50);
		const result = computeSegmentEpochs(series, [], {
			preMs: 100,
			postMs: 100,
			gridStepMs: 50,
		});
		expect(result.epochs).toEqual([]);
	});
});
