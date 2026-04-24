import { describe, expect, it } from 'vitest';

import { computePercentChange } from '@pupil/metrics/normalization';

describe('computePercentChange', () => {
	it('computes (value - baseline) / baseline * 100 per sample', () => {
		const samples = [
			{ timeMs: 0, valueMm: 3.0 },
			{ timeMs: 100, valueMm: 3.3 },
			{ timeMs: 200, valueMm: 2.7 },
		];
		const baseline = [
			{ timeMs: 0, baselineMm: 3.0, windowSize: 1 },
			{ timeMs: 100, baselineMm: 3.0, windowSize: 1 },
			{ timeMs: 200, baselineMm: 3.0, windowSize: 1 },
		];
		const out = computePercentChange(samples, baseline);
		expect(out[0].percentChange).toBe(0);
		expect(out[1].percentChange).toBeCloseTo(10, 9);
		expect(out[2].percentChange).toBeCloseTo(-10, 9);
	});

	it('produces NaN when baseline is zero or non-finite', () => {
		const samples = [
			{ timeMs: 0, valueMm: 3.0 },
			{ timeMs: 100, valueMm: 3.0 },
		];
		const baseline = [
			{ timeMs: 0, baselineMm: 0, windowSize: 0 },
			{ timeMs: 100, baselineMm: NaN, windowSize: 0 },
		];
		const out = computePercentChange(samples, baseline);
		expect(out[0].percentChange).toBeNaN();
		expect(out[1].percentChange).toBeNaN();
	});

	it('throws when sample and baseline lengths disagree', () => {
		expect(() =>
			computePercentChange(
				[{ timeMs: 0, valueMm: 1 }],
				[
					{ timeMs: 0, baselineMm: 1, windowSize: 1 },
					{ timeMs: 1, baselineMm: 1, windowSize: 1 },
				]
			)
		).toThrow();
	});
});
