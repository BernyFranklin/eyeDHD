/**
 * Parses a timestamp string in hh:mm:ss:xx format into milliseconds.
 *
 * Accepted formats:
 *   hh:mm:ss:xx   (xx = centiseconds, i.e. hundredths of a second)
 *   hh:mm:ss      (no fractional part)
 *
 * Returns null if the string does not match.
 */
export function parseTimestampToMs(input: string): number | null {
	const trimmed = input.trim();
	const match = trimmed.match(
		/^(\d{1,2}):(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/
	);
	if (!match) return null;

	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const seconds = Number(match[3]);
	const centiseconds = match[4] !== undefined ? Number(match[4]) : 0;

	if (minutes >= 60 || seconds >= 60 || centiseconds >= 100) return null;

	return (
		hours * 3_600_000 +
		minutes * 60_000 +
		seconds * 1_000 +
		centiseconds * 10
	);
}

/**
 * Formats a millisecond value back into hh:mm:ss:xx string.
 */
export function msToTimestamp(ms: number): string {
	const totalCentiseconds = Math.round(ms / 10);
	const centiseconds = totalCentiseconds % 100;
	const totalSeconds = Math.floor(totalCentiseconds / 100);
	const seconds = totalSeconds % 60;
	const totalMinutes = Math.floor(totalSeconds / 60);
	const minutes = totalMinutes % 60;
	const hours = Math.floor(totalMinutes / 60);

	const pad2 = (n: number) => String(n).padStart(2, '0');
	return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}:${pad2(centiseconds)}`;
}
