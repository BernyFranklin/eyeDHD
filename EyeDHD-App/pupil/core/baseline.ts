/**
 * Computes a rolling baseline over a time series. For each input sample at
 * time t, the baseline is the configured percentile of all samples within
 * the window centered on t (or trailing back from t when `centered: false`).
 *
 * The default — 10th percentile over a 15 s sliding window — approximates a
 * resting-state pupil signal even under sustained arousal: troughs of the
 * raw signal track the participant's tonic baseline more faithfully than a
 * pre-trial mean does.
 *
 * Implementation: maintains a sorted-array sliding window (binary-search
 * insert + delete) so percentile lookup is O(1) per sample. Total cost is
 * O(n·w) for shifts rather than O(n·w log w) for a per-sample sort, which
 * matters once recordings climb past a minute or two at typical sample rates.
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

	const n = samples.length;
	const out: BaselinePoint[] = new Array(n);

	// Sorted view of the values currently inside the window. Updated
	// incrementally as the window slides forward.
	const windowVals: number[] = [];
	let lo = 0;
	let hi = 0;

	for (let i = 0; i < n; i++) {
		const t = samples[i].timeMs;
		const windowStart = centered ? t - windowMs / 2 : t - windowMs;
		const windowEnd = centered ? t + windowMs / 2 : t;

		// Add samples that just entered the window's right edge.
		while (hi < n && samples[hi].timeMs <= windowEnd) {
			insertSorted(windowVals, samples[hi].valueMm);
			hi++;
		}
		// Remove samples that just left the window's left edge.
		while (lo < n && samples[lo].timeMs < windowStart) {
			removeSorted(windowVals, samples[lo].valueMm);
			lo++;
		}

		out[i] = {
			timeMs: t,
			baselineMm: windowVals.length > 0 ? quantileFromSorted(windowVals, percentile) : NaN,
			windowSize: windowVals.length,
		};
	}

	return out;
}

function insertSorted(arr: number[], v: number): void {
	let lo = 0;
	let hi = arr.length;
	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		if (arr[mid] < v) lo = mid + 1;
		else hi = mid;
	}
	arr.splice(lo, 0, v);
}

function removeSorted(arr: number[], v: number): void {
	// Binary search for any index with value v, then linearly walk to the
	// first matching index to keep removal deterministic in the face of ties.
	let lo = 0;
	let hi = arr.length - 1;
	while (lo <= hi) {
		const mid = (lo + hi) >>> 1;
		if (arr[mid] < v) lo = mid + 1;
		else if (arr[mid] > v) hi = mid - 1;
		else {
			// Walk back to the first occurrence to remove a stable element.
			let k = mid;
			while (k > 0 && arr[k - 1] === v) k--;
			arr.splice(k, 1);
			return;
		}
	}
	// If we reach here the value wasn't in the window — should never happen
	// when caller invariants hold (every removed value was previously inserted).
	throw new Error(`removeSorted: value ${v} not present in window`);
}

function quantileFromSorted(sorted: ReadonlyArray<number>, p: number): number {
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
