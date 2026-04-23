export type TimeUnit = 'ms' | 's' | 'min';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/** Auto-select a time unit for an axis spanning `durationMs`. */
export function pickTimeUnit(durationMs: number): TimeUnit {
	if (!Number.isFinite(durationMs) || durationMs < 10_000) return 'ms';
	if (durationMs < 120_000) return 's';
	return 'min';
}

/** Convert a millisecond value into the given unit. */
export function scaleTime(ms: number, unit: TimeUnit): number {
	if (unit === 'ms') return ms;
	if (unit === 's') return ms / MS_PER_SECOND;
	return ms / MS_PER_MINUTE;
}

/** Axis label for a given unit. */
export function timeAxisLabel(unit: TimeUnit): string {
	if (unit === 'ms') return 'Time (ms)';
	if (unit === 's') return 'Time (s)';
	return 'Time (min)';
}

/** Event-locked axis label (time relative to event onset). */
export function relativeTimeAxisLabel(unit: TimeUnit): string {
	if (unit === 'ms') return 'Time relative to event (ms)';
	if (unit === 's') return 'Time relative to event (s)';
	return 'Time relative to event (min)';
}
