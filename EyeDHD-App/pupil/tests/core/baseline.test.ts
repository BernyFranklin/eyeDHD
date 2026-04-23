import { describe, expect, it } from 'vitest';

import { computeRollingBaseline } from '@pupil/core/baseline';

function makeSamples(values: number[], stepMs = 100): { timeMs: number; valueMm: number }[] {
	return values.map((v, i) => ({ timeMs: i * stepMs, valueMm: v }));
}

describe('computeRollingBaseline', () => {
	it('returns one baseline point per input sample, preserving timestamps', () => {
		const samples = makeSamples([3, 3, 3, 3, 3]);
		const result = computeRollingBaseline(samples, { windowMs: 200, percentile: 0.5 });
		expect(result).toHaveLength(5);
		expect(result.map((p) => p.timeMs)).toEqual([0, 100, 200, 300, 400]);
	});

	it('returns the percentile of values within a centered window', () => {
		// Centered window of 200ms, step 100ms — each sample sees itself plus
		// neighbors within ±100ms.
		const samples = makeSamples([1, 2, 3, 4, 5]);
		const result = computeRollingBaseline(samples, { windowMs: 200, percentile: 0 });
		// 0th percentile = min in window. Window for sample i covers [i-1, i+1].
		expect(result.map((p) => p.baselineMm)).toEqual([1, 1, 2, 3, 4]);
	});

	it('uses a trailing-only window when centered: false', () => {
		const samples = makeSamples([1, 2, 3, 4, 5]);
		// 200ms trailing window: sample i sees indices [i-2, i-1, i].
		const result = computeRollingBaseline(samples, {
			windowMs: 200,
			percentile: 0,
			centered: false,
		});
		expect(result.map((p) => p.baselineMm)).toEqual([1, 1, 1, 2, 3]);
	});

	it('reports the window size used at each point', () => {
		const samples = makeSamples([1, 2, 3, 4, 5]);
		const result = computeRollingBaseline(samples, { windowMs: 200, percentile: 0 });
		// Edges include 2 samples; middle includes 3.
		expect(result.map((p) => p.windowSize)).toEqual([2, 3, 3, 3, 2]);
	});

	it('approximates a tonic baseline for an arousing transient', () => {
		// Mostly-flat tonic value of 3 with a brief dilation up to 6 in the middle.
		// 10th percentile of a wide window should track the tonic level, not the spike.
		const values = [3, 3, 3, 3, 3, 6, 6, 3, 3, 3, 3, 3];
		const samples = makeSamples(values);
		const result = computeRollingBaseline(samples, { windowMs: 1000, percentile: 0.1 });
		// In the window covering the spike, the 10th percentile should still be near 3.
		const middle = result[6];
		expect(middle.baselineMm).toBeLessThan(3.5);
	});

	it('rejects invalid options', () => {
		const samples = makeSamples([1, 2, 3]);
		expect(() => computeRollingBaseline(samples, { windowMs: 0, percentile: 0.5 })).toThrow();
		expect(() => computeRollingBaseline(samples, { windowMs: 100, percentile: -0.1 })).toThrow();
		expect(() => computeRollingBaseline(samples, { windowMs: 100, percentile: 1.1 })).toThrow();
	});

	it('returns NaN when no samples are present', () => {
		const result = computeRollingBaseline([], { windowMs: 100, percentile: 0.5 });
		expect(result).toEqual([]);
	});
});
