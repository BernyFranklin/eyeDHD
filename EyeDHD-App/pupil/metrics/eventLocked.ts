import type {
	EventEpoch,
	EventEpochPoint,
	EventLockedAveragePoint,
	EventLockedResult,
	NormalizedPoint,
	PupilEvent,
} from './types';

export interface ComputeEventLockedOptions {
	preMs: number;
	postMs: number;
	gridStepMs: number;
}

/**
 * Extracts an epoch around each event by linearly interpolating the per-frame
 * normalized series onto a fixed time grid in [-preMs, +postMs], then computes
 * the across-events mean and standard error at every grid step.
 *
 * Events that fall fully outside the recording (no flanking samples) yield an
 * empty epoch and contribute no samples to the average.
 */
export function computeEventLocked(
	series: ReadonlyArray<NormalizedPoint>,
	events: ReadonlyArray<PupilEvent>,
	options: ComputeEventLockedOptions
): EventLockedResult {
	const { preMs, postMs, gridStepMs } = options;
	if (gridStepMs <= 0) throw new Error('gridStepMs must be > 0');
	if (preMs < 0 || postMs < 0) throw new Error('preMs and postMs must be >= 0');

	const grid = buildGrid(preMs, postMs, gridStepMs);
	const epochs: EventEpoch[] = events.map((event) =>
		buildEpochForEvent(series, event, grid)
	);

	const average = averageAcrossEpochs(epochs, grid);

	return {
		gridStepMs,
		preMs,
		postMs,
		epochs,
		average,
	};
}

function buildGrid(preMs: number, postMs: number, step: number): number[] {
	const grid: number[] = [];
	// Tolerate floating-point creep so the post-edge is included.
	for (let t = -preMs; t <= postMs + step * 1e-9; t += step) {
		grid.push(Math.round(t * 1e6) / 1e6);
	}
	return grid;
}

function buildEpochForEvent(
	series: ReadonlyArray<NormalizedPoint>,
	event: PupilEvent,
	grid: ReadonlyArray<number>
): EventEpoch {
	const points: EventEpochPoint[] = [];
	if (series.length === 0) {
		return makeEmptyEpoch(event, grid);
	}

	for (const rel of grid) {
		const tAbs = event.timeMs + rel;
		const value = interpolateAt(series, tAbs);
		points.push({ timeRelMs: rel, percentChange: value });
	}

	return {
		eventId: event.id,
		kind: event.kind,
		label: event.label,
		eventTimeMs: event.timeMs,
		points,
	};
}

function makeEmptyEpoch(event: PupilEvent, grid: ReadonlyArray<number>): EventEpoch {
	return {
		eventId: event.id,
		kind: event.kind,
		label: event.label,
		eventTimeMs: event.timeMs,
		points: grid.map((rel) => ({ timeRelMs: rel, percentChange: NaN })),
	};
}

/**
 * Linear interpolation of `series` at absolute time `t`. Returns NaN when t
 * falls outside the series range. Uses binary search to find the bracketing
 * samples; non-finite samples are skipped (the next finite-value pair is used).
 */
function interpolateAt(series: ReadonlyArray<NormalizedPoint>, t: number): number {
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

function averageAcrossEpochs(
	epochs: ReadonlyArray<EventEpoch>,
	grid: ReadonlyArray<number>
): EventLockedAveragePoint[] {
	const out: EventLockedAveragePoint[] = new Array(grid.length);
	for (let g = 0; g < grid.length; g++) {
		let sum = 0;
		let n = 0;
		for (const epoch of epochs) {
			const v = epoch.points[g]?.percentChange;
			if (Number.isFinite(v)) {
				sum += v;
				n++;
			}
		}
		const mean = n > 0 ? sum / n : NaN;

		let sqAcc = 0;
		if (n > 1) {
			for (const epoch of epochs) {
				const v = epoch.points[g]?.percentChange;
				if (Number.isFinite(v)) {
					const d = v - mean;
					sqAcc += d * d;
				}
			}
		}
		const variance = n > 1 ? sqAcc / (n - 1) : NaN;
		const sePercent = n > 1 ? Math.sqrt(variance) / Math.sqrt(n) : NaN;

		out[g] = {
			timeRelMs: grid[g],
			meanPercent: mean,
			sePercent,
			n,
		};
	}
	return out;
}
