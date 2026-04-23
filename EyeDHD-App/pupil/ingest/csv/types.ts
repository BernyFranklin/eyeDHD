/**
 * One parsed row from the cleaned CSV. Per-eye pupil values are `null` when
 * the eye's status is not 'VALID' or the diameter is not a finite positive
 * number. Rows where both eyes are null are dropped at parse time.
 */
export interface RawPupilRow {
	rowIndex: number;          // 0-based data row index (excluding header)
	captureTimeNs: number;
	timeMs: number;            // captureTimeNs / 1e6, computed at parse time
	leftMm: number | null;
	rightMm: number | null;
}

export type PupilInvalidRowReason =
	| 'EMPTY_ROW'
	| 'MISSING_CAPTURE_TIME'
	| 'NON_NUMERIC_CAPTURE_TIME'
	| 'NEGATIVE_CAPTURE_TIME'
	| 'BOTH_EYES_INVALID'
	| 'NON_MONOTONIC_CAPTURE_TIME';

export type PupilParseWarningCode =
	| 'HAS_HEADER_ONLY'
	| 'EMPTY_FILE';

export type PupilParseErrorCode =
	| 'MISSING_REQUIRED_COLUMNS'
	| 'CSV_PARSE_FAILED';

export interface PupilParseDiagnostics {
	missingRequiredColumns: string[];

	warnings: Array<{
		code: PupilParseWarningCode;
		message: string;
		details?: Record<string, unknown>;
	}>;

	errors: Array<{
		code: PupilParseErrorCode;
		message: string;
		details?: Record<string, unknown>;
	}>;

	invalidByReason: Record<PupilInvalidRowReason, number>;

	/** Per-eye breakdown of why individual eye samples were nulled (does not invalidate the row by itself). */
	perEyeInvalid: {
		left: { invalidStatus: number; nonFiniteDiameter: number; nonPositiveDiameter: number };
		right: { invalidStatus: number; nonFiniteDiameter: number; nonPositiveDiameter: number };
	};

	captureTime: {
		isMonotonicNonDecreasing: boolean;
		firstNonMonotonicAtRowIndex?: number;
		nonMonotonicCount: number;
	};
}

export interface PupilParseMeta {
	filename?: string;

	columnsPresent: string[];
	columnMapping: {
		captureTime: string;
		leftEyeStatus: string;
		leftPupilDiameterInMM: string;
		rightEyeStatus: string;
		rightPupilDiameterInMM: string;
	};

	rowCount: number;
	validRowCount: number;
	invalidRowCount: number;

	delimiter: ',' | '\t' | ';' | '|';
	hasBom: boolean;
}

export interface ParsePupilCsvResult {
	rows: RawPupilRow[];
	meta: PupilParseMeta;
	diagnostics: PupilParseDiagnostics;
}

export interface ParsePupilCsvOptions {
	filename?: string;

	failOnMissingRequiredColumns?: boolean;                      // default true

	/** Eye-status strings that are considered usable. Default: ['VALID']. */
	includeEyeStatuses?: readonly string[];

	captureTimeMonotonicity?: 'error' | 'warn';                   // default 'warn'
	nonMonotonicHandling?: 'invalidateRow' | 'keepRow';           // default 'invalidateRow'

	delimiter?: ',' | '\t' | ';' | '|';                           // default ','
	trimWhitespace?: boolean;                                     // default true
}
