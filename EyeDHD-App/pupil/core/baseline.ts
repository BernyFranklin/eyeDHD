/**
 * Computes a rolling baseline over a time series. For each input sample at
 * time t, the baseline is the configured percentile of all samples within
 * the window centered on t (or trailing back from t when `centered: false`).
 *
 * The default — 10th percentile over a 15 s sliding window — approximates a
 * resting-state pupil signal even under sustained arousal: troughs of the
 * raw signal track the participant's tonic baseline more faithfully than a
 * pre-trial mean does.
 */

export interface BaselineSample {
	timeMs: number;
	valueMm: number;
}

export interface BaselinePoint {
	timeMs: number;
	baselineMm: number;
	/** Number of samples that fell inside the window for this point — useful for diagnostics. */
	windowSize: number;
}

export interface RollingBaselineOptions {
	windowMs: number;
	/** Percentile in [0, 1]; e.g. 0.10 for the 10th percentile. */
	percentile: number;
	/** Centered window (default) vs trailing-only window ending at t. */
	centered?: boolean;
}

export function computeRollingBaseline(
	samples: ReadonlyArray<BaselineSample>,
	options: RollingBaselineOptions
): BaselinePoint[] {
	const { windowMs, percentile } = options;
	const centered = options.centered ?? true;

	if (windowMs <= 0) throw new Error('windowMs must be > 0');
	if (percentile < 0 || percentile > 1) throw new Error('percentile must be in [0, 1]');

	const out: BaselinePoint[] = new Array(samples.length);
	let lo = 0;
	let hi = 0;

	// Reusable scratch buffer to avoid per-iteration allocations.
	const scratch: number[] = [];

	for (let i = 0; i < samples.length; i++) {
		const t = samples[i].timeMs;
		const windowStart = centered ? t - windowMs / 2 : t - windowMs;
		const windowEnd = centered ? t + windowMs / 2 : t;

		// Advance window boundaries forward; samples are time-ordered.
		while (lo < samples.length && samples[lo].timeMs < windowStart) lo++;
		while (hi < samples.length && samples[hi].timeMs <= windowEnd) hi++;

		const count = hi - lo;
		scratch.length = count;
		for (let k = 0; k < count; k++) scratch[k] = samples[lo + k].valueMm;
		// O(n*w log w). The TODO is to swap in a sorted-deque or quickselect
		// once we hit performance ceilings on long recordings.
		scratch.sort((a, b) => a - b);

		out[i] = {
			timeMs: t,
			baselineMm: count > 0 ? quantileFromSorted(scratch, percentile) : NaN,
			windowSize: count,
		};
	}

	return out;
}

function quantileFromSorted(sorted: number[], p: number): number {
	const n = sorted.length;
	if (n === 0) return NaN;
	if (n === 1) return sorted[0];
	const idx = (n - 1) * p;
	const lo = Math.floor(idx);
	const hi = Math.ceil(idx);
	if (lo === hi) return sorted[lo];
	const t = idx - lo;
	return sorted[lo] * (1 - t) + sorted[hi] * t;
}
