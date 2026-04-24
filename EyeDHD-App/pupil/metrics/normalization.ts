import type { BaselinePoint, BaselineSample } from '@pupil/core/baseline';
import type { NormalizedPoint } from './types';

/**
 * Pairs each sample with its baseline value and computes percent change.
 * Inputs must be aligned 1:1 (baseline produced from the same samples).
 * Where baseline is non-positive or non-finite, percentChange is NaN.
 */
export function computePercentChange(
	samples: ReadonlyArray<BaselineSample>,
	baseline: ReadonlyArray<BaselinePoint>
): NormalizedPoint[] {
	if (samples.length !== baseline.length) {
		throw new Error(
			`samples.length (${samples.length}) must equal baseline.length (${baseline.length})`
		);
	}
	const out: NormalizedPoint[] = new Array(samples.length);
	for (let i = 0; i < samples.length; i++) {
		const v = samples[i].valueMm;
		const b = baseline[i].baselineMm;
		const pct = Number.isFinite(b) && b > 0 ? ((v - b) / b) * 100 : NaN;
		out[i] = {
			timeMs: samples[i].timeMs,
			valueMm: v,
			baselineMm: b,
			percentChange: pct,
		};
	}
	return out;
}
