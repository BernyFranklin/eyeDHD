import { describe, expect, it } from 'vitest';

import { computeEventLocked } from '@pupil/metrics/eventLocked';
import type { NormalizedPoint } from '@pupil/metrics/types';

function flatSeries(values: number[], stepMs = 100): NormalizedPoint[] {
	return values.map((v, i) => ({
		timeMs: i * stepMs,
		valueMm: 3,
		baselineMm: 3,
		percentChange: v,
	}));
}

describe('computeEventLocked', () => {
	it('builds a uniform time grid in [-preMs, +postMs]', () => {
		const series = flatSeries([0, 0, 0, 0, 0]);
		const result = computeEventLocked(series, [{ id: 'e1', timeMs: 200 }], {
			preMs: 100,
			postMs: 100,
			gridStepMs: 50,
		});
		expect(result.epochs[0].points.map((p) => p.timeRelMs)).toEqual([
			-100, -50, 0, 50, 100,
		]);
	});

	it('interpolates the series at each grid point relative to the event', () => {
		// Linear ramp 0..400 across timeMs 0..400.
		const series: NormalizedPoint[] = [0, 100, 200, 300, 400].map((v, i) => ({
			timeMs: i * 100,
			valueMm: 3,
			baselineMm: 3,
			percentChange: v,
		}));
		const result = computeEventLocked(series, [{ id: 'e1', timeMs: 200 }], {
			preMs: 100,
			postMs: 100,
			gridStepMs: 50,
		});
		// Event at t=200 → grid points map to absolute times 100,150,200,250,300
		// → values 100, 150, 200, 250, 300.
		expect(result.epochs[0].points.map((p) => p.percentChange)).toEqual([
			100, 150, 200, 250, 300,
		]);
	});

	it('returns NaN for grid points that fall outside the recording', () => {
		const series = flatSeries([10, 10, 10]); // 0..200ms only
		const result = computeEventLocked(series, [{ id: 'e1', timeMs: 200 }], {
			preMs: 100,
			postMs: 200,
			gridStepMs: 100,
		});
		const pts = result.epochs[0].points;
		expect(pts[0].percentChange).toBe(10); // -100ms → t=100
		expect(pts[1].percentChange).toBe(10); // 0    → t=200
		expect(pts[2].percentChange).toBeNaN(); // +100 → t=300, past end
		expect(pts[3].percentChange).toBeNaN(); // +200 → t=400, past end
	});

	it('averages across epochs and reports n at each grid point', () => {
		const series: NormalizedPoint[] = Array.from({ length: 10 }, (_, i) => ({
			timeMs: i * 100,
			valueMm: 3,
			baselineMm: 3,
			percentChange: i * 10,
		}));
		const result = computeEventLocked(
			series,
			[
				{ id: 'a', timeMs: 200 },
				{ id: 'b', timeMs: 500 },
			],
			{ preMs: 100, postMs: 100, gridStepMs: 100 }
		);
		// At rel=0, epoch a contributes 20, epoch b contributes 50 → mean 35, n=2.
		const at0 = result.average.find((a) => a.timeRelMs === 0)!;
		expect(at0.meanPercent).toBe(35);
		expect(at0.n).toBe(2);
		expect(at0.sePercent).toBeGreaterThan(0);
	});

	it('skips non-finite epoch contributions in the average', () => {
		const series: NormalizedPoint[] = Array.from({ length: 5 }, (_, i) => ({
			timeMs: i * 100,
			valueMm: 3,
			baselineMm: 3,
			percentChange: 50,
		}));
		const result = computeEventLocked(
			series,
			[
				{ id: 'in', timeMs: 200 },
				{ id: 'out', timeMs: 9999 }, // entirely outside the recording
			],
			{ preMs: 100, postMs: 100, gridStepMs: 100 }
		);
		const at0 = result.average.find((a) => a.timeRelMs === 0)!;
		expect(at0.meanPercent).toBe(50);
		expect(at0.n).toBe(1);
		expect(at0.sePercent).toBeNaN(); // need n > 1 for SE
	});

	it('rejects invalid options', () => {
		const series = flatSeries([1, 2, 3]);
		expect(() =>
			computeEventLocked(series, [{ id: 'e', timeMs: 100 }], {
				preMs: 100,
				postMs: 100,
				gridStepMs: 0,
			})
		).toThrow();
		expect(() =>
			computeEventLocked(series, [{ id: 'e', timeMs: 100 }], {
				preMs: -1,
				postMs: 100,
				gridStepMs: 50,
			})
		).toThrow();
	});
});
