import { describe, it, expect } from 'vitest';
import { parseTimestampToMs, msToTimestamp } from '../parseTimestamp';

describe('parseTimestampToMs', () => {
	it('parses hh:mm:ss:xx with all four parts', () => {
		expect(parseTimestampToMs('01:23:45:67')).toBe(
			1 * 3_600_000 + 23 * 60_000 + 45 * 1_000 + 67 * 10
		);
	});

	it('parses hh:mm:ss without fractional part', () => {
		expect(parseTimestampToMs('00:05:30')).toBe(5 * 60_000 + 30 * 1_000);
	});

	it('parses zero timestamp', () => {
		expect(parseTimestampToMs('00:00:00:00')).toBe(0);
	});

	it('parses single-digit components', () => {
		expect(parseTimestampToMs('0:1:2:3')).toBe(
			0 * 3_600_000 + 1 * 60_000 + 2 * 1_000 + 3 * 10
		);
	});

	it('returns null for invalid minutes >= 60', () => {
		expect(parseTimestampToMs('00:60:00:00')).toBeNull();
	});

	it('returns null for invalid seconds >= 60', () => {
		expect(parseTimestampToMs('00:00:60:00')).toBeNull();
	});

	it('returns null for empty string', () => {
		expect(parseTimestampToMs('')).toBeNull();
	});

	it('returns null for non-timestamp text', () => {
		expect(parseTimestampToMs('not a timestamp')).toBeNull();
	});

	it('trims surrounding whitespace', () => {
		expect(parseTimestampToMs('  00:01:00:00  ')).toBe(60_000);
	});
});

describe('msToTimestamp', () => {
	it('formats zero', () => {
		expect(msToTimestamp(0)).toBe('00:00:00:00');
	});

	it('round-trips with parseTimestampToMs', () => {
		const inputs = ['00:00:00:00', '01:23:45:67', '00:05:30:00', '12:00:00:50'];
		for (const input of inputs) {
			const ms = parseTimestampToMs(input)!;
			expect(msToTimestamp(ms)).toBe(input);
		}
	});

	it('formats a known value', () => {
		// 1h 30m 15s 25cs = 5_415_250 ms
		expect(msToTimestamp(5_415_250)).toBe('01:30:15:25');
	});
});
