import type { NormalizedPoint } from './types';

/**
 * Linear interpolation of `series` at absolute time `t`. Returns NaN when t
 * falls outside the series range. Uses binary search to find the bracketing
 * samples; non-finite samples cause NaN at that point.
 */
export function interpolateAt(
	series: ReadonlyArray<NormalizedPoint>,
	t: number
): number {
	const n = series.length;
	if (n === 0) return NaN;
	if (t < series[0].timeMs || t > series[n - 1].timeMs) return NaN;

	let lo = 0;
	let hi = n - 1;
	while (lo + 1 < hi) {
		const mid = (lo + hi) >>> 1;
		if (series[mid].timeMs <= t) lo = mid;
		else hi = mid;
	}

	const a = series[lo];
	const b = series[hi];
	if (!Number.isFinite(a.percentChange) || !Number.isFinite(b.percentChange)) return NaN;
	if (a.timeMs === b.timeMs) return a.percentChange;
	const frac = (t - a.timeMs) / (b.timeMs - a.timeMs);
	return a.percentChange + frac * (b.percentChange - a.percentChange);
}
