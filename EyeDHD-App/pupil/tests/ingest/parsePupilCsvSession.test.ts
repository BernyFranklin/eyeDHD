import { describe, expect, it } from 'vitest';

import { parsePupilCsvSession } from '@pupil/ingest/csv/parsePupilCsvSession';

const HEADER = [
	'Frame',
	'CaptureTime',
	'LogTime',
	'GazeStatus',
	'CombinedGazeForwardX',
	'CombinedGazeForwardY',
	'CombinedGazeForwardZ',
	'LeftEyeStatus',
	'LeftEyeForwardX',
	'LeftEyeForwardY',
	'LeftEyeForwardZ',
	'LeftPupilDiameterInMM',
	'RightEyeStatus',
	'RightEyeForwardX',
	'RightEyeForwardY',
	'RightEyeForwardZ',
	'RightPupilDiameterInMM',
].join(',');

interface RowOpts {
	frame?: number;
	captureTimeNs?: number;
	leftStatus?: string;
	leftMm?: number | string;
	rightStatus?: string;
	rightMm?: number | string;
}

function row(opts: RowOpts = {}): string {
	const frame = opts.frame ?? 0;
	const captureTime = opts.captureTimeNs ?? 0;
	const leftStatus = opts.leftStatus ?? 'VALID';
	const leftMm = opts.leftMm ?? 3.5;
	const rightStatus = opts.rightStatus ?? 'VALID';
	const rightMm = opts.rightMm ?? 3.5;
	return [
		frame, captureTime, captureTime,
		'VALID',
		0, 0, -1,
		leftStatus, 0, 0, -1, leftMm,
		rightStatus, 0, 0, -1, rightMm,
	].join(',');
}

function csv(...rows: string[]): string {
	return [HEADER, ...rows].join('\n');
}

describe('parsePupilCsvSession', () => {
	describe('column validation', () => {
		it('reports missing required columns and aborts when failOnMissingRequiredColumns', () => {
			const text = 'Frame,CaptureTime\n0,1000\n';
			const result = parsePupilCsvSession(text);
			expect(result.rows).toEqual([]);
			expect(result.diagnostics.missingRequiredColumns).toEqual([
				'LeftEyeStatus',
				'LeftPupilDiameterInMM',
				'RightEyeStatus',
				'RightPupilDiameterInMM',
			]);
			expect(result.diagnostics.errors[0]?.code).toBe('MISSING_REQUIRED_COLUMNS');
		});

		it('continues parsing when failOnMissingRequiredColumns is false', () => {
			const text = 'Frame,CaptureTime\n0,1000\n';
			const result = parsePupilCsvSession(text, { failOnMissingRequiredColumns: false });
			expect(result.diagnostics.errors[0]?.code).toBe('MISSING_REQUIRED_COLUMNS');
			// No rows can be emitted without the eye columns, but the parse doesn't throw.
			expect(result.rows).toEqual([]);
		});
	});

	describe('basic row parsing', () => {
		it('emits one row per valid line and converts ns to ms', () => {
			const text = csv(
				row({ captureTimeNs: 1_000_000, leftMm: 3.2, rightMm: 3.4 }),
				row({ frame: 1, captureTimeNs: 6_000_000, leftMm: 3.3, rightMm: 3.5 })
			);
			const result = parsePupilCsvSession(text);
			expect(result.rows).toHaveLength(2);
			expect(result.rows[0]).toEqual({
				rowIndex: 0,
				captureTimeNs: 1_000_000,
				timeMs: 1,
				leftMm: 3.2,
				rightMm: 3.4,
			});
			expect(result.rows[1].timeMs).toBe(6);
			expect(result.meta.validRowCount).toBe(2);
			expect(result.meta.invalidRowCount).toBe(0);
		});

		it('warns and returns no rows for header-only CSV', () => {
			const result = parsePupilCsvSession(HEADER + '\n');
			expect(result.rows).toEqual([]);
			expect(result.diagnostics.warnings[0]?.code).toBe('HAS_HEADER_ONLY');
		});

		it('warns and returns no rows for fully empty CSV', () => {
			const result = parsePupilCsvSession('');
			expect(result.rows).toEqual([]);
			expect(result.diagnostics.warnings[0]?.code).toBe('EMPTY_FILE');
		});

		it('strips a UTF-8 BOM from the first line', () => {
			const text = '﻿' + csv(row({ captureTimeNs: 1_000_000 }));
			const result = parsePupilCsvSession(text);
			expect(result.meta.hasBom).toBe(true);
			expect(result.rows).toHaveLength(1);
		});
	});

	describe('per-eye filtering', () => {
		it('nulls a single eye when its status is not in includeEyeStatuses but keeps the row', () => {
			const text = csv(row({ captureTimeNs: 1_000_000, leftStatus: 'INVALID', leftMm: 0 }));
			const result = parsePupilCsvSession(text);
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].leftMm).toBeNull();
			expect(result.rows[0].rightMm).toBe(3.5);
			expect(result.diagnostics.perEyeInvalid.left.invalidStatus).toBe(1);
		});

		it('nulls a single eye when diameter is 0 (DataCleaner default for missing)', () => {
			const text = csv(row({ captureTimeNs: 1_000_000, rightMm: 0 }));
			const result = parsePupilCsvSession(text);
			expect(result.rows[0].rightMm).toBeNull();
			expect(result.diagnostics.perEyeInvalid.right.nonPositiveDiameter).toBe(1);
		});

		it('nulls a single eye when diameter is non-finite (NaN-yielding cell)', () => {
			const text = csv(row({ captureTimeNs: 1_000_000, leftMm: 'abc' }));
			const result = parsePupilCsvSession(text);
			expect(result.rows[0].leftMm).toBeNull();
			expect(result.diagnostics.perEyeInvalid.left.nonFiniteDiameter).toBe(1);
		});

		it('drops the row when both eyes are invalid', () => {
			const text = csv(
				row({ captureTimeNs: 1_000_000, leftMm: 0, rightStatus: 'LOST', rightMm: 0 }),
				row({ frame: 1, captureTimeNs: 6_000_000 })
			);
			const result = parsePupilCsvSession(text);
			expect(result.rows).toHaveLength(1);
			expect(result.rows[0].timeMs).toBe(6);
			expect(result.diagnostics.invalidByReason.BOTH_EYES_INVALID).toBe(1);
			expect(result.meta.invalidRowCount).toBe(1);
		});

		it('honors a custom includeEyeStatuses set', () => {
			const text = csv(row({ captureTimeNs: 1_000_000, leftStatus: 'TRACKING', rightStatus: 'TRACKING' }));

			const lockedDown = parsePupilCsvSession(text);
			expect(lockedDown.rows).toHaveLength(0);
			expect(lockedDown.diagnostics.invalidByReason.BOTH_EYES_INVALID).toBe(1);

			const broadened = parsePupilCsvSession(text, { includeEyeStatuses: ['VALID', 'TRACKING'] });
			expect(broadened.rows).toHaveLength(1);
			expect(broadened.rows[0].leftMm).toBe(3.5);
		});
	});

	describe('CaptureTime validation', () => {
		it('drops rows with missing or non-numeric CaptureTime', () => {
			const text = csv(
				row({ captureTimeNs: 1_000_000 }),
				',,,,,,,,,,,,,,,,'.replace(/^,/, '1,'), // bare commas, missing CaptureTime
				row({ frame: 2, captureTimeNs: 7_000_000 })
			);
			const result = parsePupilCsvSession(text);
			expect(result.rows.map((r) => r.timeMs)).toEqual([1, 7]);
			expect(result.diagnostics.invalidByReason.MISSING_CAPTURE_TIME).toBe(1);
		});

		it('drops rows with negative CaptureTime', () => {
			const text = csv(row({ captureTimeNs: -5 }), row({ frame: 1, captureTimeNs: 1_000_000 }));
			const result = parsePupilCsvSession(text);
			expect(result.rows).toHaveLength(1);
			expect(result.diagnostics.invalidByReason.NEGATIVE_CAPTURE_TIME).toBe(1);
		});

		it('flags non-monotonic CaptureTime and invalidates by default', () => {
			const text = csv(
				row({ captureTimeNs: 5_000_000 }),
				row({ frame: 1, captureTimeNs: 1_000_000 }),
				row({ frame: 2, captureTimeNs: 6_000_000 })
			);
			const result = parsePupilCsvSession(text);
			expect(result.rows.map((r) => r.timeMs)).toEqual([5, 6]);
			expect(result.diagnostics.captureTime.isMonotonicNonDecreasing).toBe(false);
			expect(result.diagnostics.captureTime.nonMonotonicCount).toBe(1);
			expect(result.diagnostics.invalidByReason.NON_MONOTONIC_CAPTURE_TIME).toBe(1);
		});

		it('keeps non-monotonic rows when configured to keepRow', () => {
			const text = csv(
				row({ captureTimeNs: 5_000_000 }),
				row({ frame: 1, captureTimeNs: 1_000_000 })
			);
			const result = parsePupilCsvSession(text, { nonMonotonicHandling: 'keepRow' });
			expect(result.rows).toHaveLength(2);
			expect(result.diagnostics.captureTime.nonMonotonicCount).toBe(1);
		});

		it('records an error entry when monotonicity is set to error', () => {
			const text = csv(
				row({ captureTimeNs: 5_000_000 }),
				row({ frame: 1, captureTimeNs: 1_000_000 })
			);
			const result = parsePupilCsvSession(text, { captureTimeMonotonicity: 'error' });
			expect(result.diagnostics.errors[0]?.code).toBe('CSV_PARSE_FAILED');
		});
	});
});
