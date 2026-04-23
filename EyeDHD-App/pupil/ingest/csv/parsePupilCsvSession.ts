import type {
	ParsePupilCsvOptions,
	ParsePupilCsvResult,
	PupilInvalidRowReason,
	PupilParseDiagnostics,
	PupilParseMeta,
	RawPupilRow,
} from './types';

const REQUIRED_COLUMNS = [
	'CaptureTime',
	'LeftEyeStatus',
	'LeftPupilDiameterInMM',
	'RightEyeStatus',
	'RightPupilDiameterInMM',
] as const;

const DEFAULT_INCLUDE_STATUSES: readonly string[] = ['VALID'];

function initInvalidCounters(): Record<PupilInvalidRowReason, number> {
	return {
		EMPTY_ROW: 0,
		MISSING_CAPTURE_TIME: 0,
		NON_NUMERIC_CAPTURE_TIME: 0,
		NEGATIVE_CAPTURE_TIME: 0,
		BOTH_EYES_INVALID: 0,
		NON_MONOTONIC_CAPTURE_TIME: 0,
	};
}

function initPerEyeInvalid(): PupilParseDiagnostics['perEyeInvalid'] {
	return {
		left: { invalidStatus: 0, nonFiniteDiameter: 0, nonPositiveDiameter: 0 },
		right: { invalidStatus: 0, nonFiniteDiameter: 0, nonPositiveDiameter: 0 },
	};
}

function normalizeCell(cell: string, trim: boolean): string {
	return trim ? cell.trim() : cell;
}

function splitLines(csvText: string): string[] {
	const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const lines = normalized.split('\n');
	while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
	return lines;
}

interface EyeParseOutcome {
	value: number | null;
	reason: 'invalidStatus' | 'nonFiniteDiameter' | 'nonPositiveDiameter' | null;
}

function parseEye(
	statusRaw: string,
	diameterRaw: string,
	includeStatuses: ReadonlySet<string>
): EyeParseOutcome {
	if (!includeStatuses.has(statusRaw)) {
		return { value: null, reason: 'invalidStatus' };
	}
	const v = Number(diameterRaw);
	if (!Number.isFinite(v)) {
		return { value: null, reason: 'nonFiniteDiameter' };
	}
	// DataCleaner writes 0 when the diameter is missing. A real pupil diameter is
	// always > 0 mm, so treat 0 (and any non-positive) as missing.
	if (v <= 0) {
		return { value: null, reason: 'nonPositiveDiameter' };
	}
	return { value: v, reason: null };
}

export function parsePupilCsvSession(
	csvText: string,
	options: ParsePupilCsvOptions = {}
): ParsePupilCsvResult {
	const delimiter = options.delimiter ?? ',';
	const trim = options.trimWhitespace ?? true;
	const failOnMissingRequiredColumns = options.failOnMissingRequiredColumns ?? true;
	const captureTimeMonotonicity = options.captureTimeMonotonicity ?? 'warn';
	const nonMonotonicHandling = options.nonMonotonicHandling ?? 'invalidateRow';

	const includeStatuses = new Set(options.includeEyeStatuses ?? DEFAULT_INCLUDE_STATUSES);

	const hasBom = csvText.charCodeAt(0) === 0xfeff;
	const text = hasBom ? csvText.slice(1) : csvText;

	const invalidByReason = initInvalidCounters();
	const perEyeInvalid = initPerEyeInvalid();

	const diagnostics: PupilParseDiagnostics = {
		missingRequiredColumns: [],
		warnings: [],
		errors: [],
		invalidByReason,
		perEyeInvalid,
		captureTime: {
			isMonotonicNonDecreasing: true,
			nonMonotonicCount: 0,
		},
	};

	const baseColumnMapping: PupilParseMeta['columnMapping'] = {
		captureTime: 'CaptureTime',
		leftEyeStatus: 'LeftEyeStatus',
		leftPupilDiameterInMM: 'LeftPupilDiameterInMM',
		rightEyeStatus: 'RightEyeStatus',
		rightPupilDiameterInMM: 'RightPupilDiameterInMM',
	};

	const lines = splitLines(text);

	if (lines.length === 0) {
		diagnostics.warnings.push({ code: 'EMPTY_FILE', message: 'CSV text is empty.' });
		return {
			rows: [],
			meta: {
				filename: options.filename,
				columnsPresent: [],
				columnMapping: baseColumnMapping,
				rowCount: 0,
				validRowCount: 0,
				invalidRowCount: 0,
				delimiter,
				hasBom,
			},
			diagnostics,
		};
	}

	const headerLine = lines[0];
	const headerCells = headerLine.split(delimiter).map((c) => normalizeCell(c, trim));
	const colIndex: Record<string, number> = {};
	for (let i = 0; i < headerCells.length; i++) {
		colIndex[headerCells[i]] = i;
	}

	const missing = REQUIRED_COLUMNS.filter((c) => colIndex[c] === undefined);
	diagnostics.missingRequiredColumns = missing.slice();

	const meta: PupilParseMeta = {
		filename: options.filename,
		columnsPresent: headerCells,
		columnMapping: baseColumnMapping,
		rowCount: Math.max(0, lines.length - 1),
		validRowCount: 0,
		invalidRowCount: 0,
		delimiter,
		hasBom,
	};

	if (missing.length > 0) {
		diagnostics.errors.push({
			code: 'MISSING_REQUIRED_COLUMNS',
			message: `Missing required columns: ${missing.join(', ')}`,
			details: { missingRequiredColumns: missing },
		});
		if (failOnMissingRequiredColumns) {
			return {
				rows: [],
				meta: { ...meta, validRowCount: 0, invalidRowCount: meta.rowCount },
				diagnostics,
			};
		}
	}

	if (lines.length === 1) {
		diagnostics.warnings.push({
			code: 'HAS_HEADER_ONLY',
			message: 'CSV has a header row but no data rows.',
		});
		return { rows: [], meta, diagnostics };
	}

	const rows: RawPupilRow[] = [];
	let lastCaptureTimeNs: number | null = null;

	for (let rowIndex = 0; rowIndex < lines.length - 1; rowIndex++) {
		const line = lines[rowIndex + 1];
		if (line.trim() === '') {
			invalidByReason.EMPTY_ROW++;
			meta.invalidRowCount++;
			continue;
		}

		const cells = line.split(delimiter).map((c) => normalizeCell(c, trim));
		const get = (col: string): string => {
			const idx = colIndex[col];
			if (idx === undefined) return '';
			return cells[idx] ?? '';
		};

		const captureTimeRaw = get('CaptureTime');
		if (captureTimeRaw === '') {
			invalidByReason.MISSING_CAPTURE_TIME++;
			meta.invalidRowCount++;
			continue;
		}

		const captureTimeNs = Number(captureTimeRaw);
		if (!Number.isFinite(captureTimeNs)) {
			invalidByReason.NON_NUMERIC_CAPTURE_TIME++;
			meta.invalidRowCount++;
			continue;
		}
		if (captureTimeNs < 0) {
			invalidByReason.NEGATIVE_CAPTURE_TIME++;
			meta.invalidRowCount++;
			continue;
		}

		// Monotonicity check (mirrors saccades parser semantics)
		if (lastCaptureTimeNs !== null && captureTimeNs < lastCaptureTimeNs) {
			invalidByReason.NON_MONOTONIC_CAPTURE_TIME++;
			diagnostics.captureTime.isMonotonicNonDecreasing = false;
			diagnostics.captureTime.nonMonotonicCount++;
			if (diagnostics.captureTime.firstNonMonotonicAtRowIndex === undefined) {
				diagnostics.captureTime.firstNonMonotonicAtRowIndex = rowIndex;
			}
			if (captureTimeMonotonicity === 'error') {
				diagnostics.errors.push({
					code: 'CSV_PARSE_FAILED',
					message: 'Non-monotonic CaptureTime encountered.',
					details: { rowIndex, lastCaptureTimeNs, captureTimeNs },
				});
			}
			if (nonMonotonicHandling === 'invalidateRow') {
				meta.invalidRowCount++;
				continue;
			}
		}

		const left = parseEye(get('LeftEyeStatus'), get('LeftPupilDiameterInMM'), includeStatuses);
		if (left.reason) perEyeInvalid.left[left.reason]++;

		const right = parseEye(get('RightEyeStatus'), get('RightPupilDiameterInMM'), includeStatuses);
		if (right.reason) perEyeInvalid.right[right.reason]++;

		if (left.value === null && right.value === null) {
			invalidByReason.BOTH_EYES_INVALID++;
			meta.invalidRowCount++;
			// Do not advance lastCaptureTimeNs so monotonicity tracking stays
			// based on emitted rows (matches saccades parser behavior).
			continue;
		}

		rows.push({
			rowIndex,
			captureTimeNs,
			timeMs: captureTimeNs / 1e6,
			leftMm: left.value,
			rightMm: right.value,
		});
		meta.validRowCount++;
		lastCaptureTimeNs = captureTimeNs;
	}

	return { rows, meta, diagnostics };
}
