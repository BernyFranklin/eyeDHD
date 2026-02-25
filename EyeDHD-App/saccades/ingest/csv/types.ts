import type { Vec3 } from '../../velocities';

export interface RawGazeRow {
  rowIndex:            number;    // 0-based data row index (excluding header)
  captureTimeNs:       number;
  gazeStatus:          string;
  combinedGazeForward: Vec3;
}

export type InvalidRowReason =
  | 'EMPTY_ROW'
  | 'MISSING_CAPTURE_TIME'
  | 'NON_NUMERIC_CAPTURE_TIME'
  | 'NON_INTEGER_CAPTURE_TIME'
  | 'NEGATIVE_CAPTURE_TIME'
  | 'MISSING_GAZE_STATUS'
  | 'MISSING_FORWARD_X'
  | 'MISSING_FORWARD_Y'
  | 'MISSING_FORWARD_Z'
  | 'NON_NUMERIC_FORWARD_X'
  | 'NON_NUMERIC_FORWARD_Y'
  | 'NON_NUMERIC_FORWARD_Z'
  | 'NON_FINITE_FORWARD_X'
  | 'NON_FINITE_FORWARD_Y'
  | 'NON_FINITE_FORWARD_Z'
  | 'NON_MONOTONIC_CAPTURE_TIME';

export type ParseWarningCode =
  | 'IRREGULAR_DT_JITTER'
  | 'HAS_HEADER_ONLY'
  | 'EMPTY_FILE';

export type ParseErrorCode =
  | 'MISSING_REQUIRED_COLUMNS'
  | 'CSV_PARSE_FAILED';

export interface DtStats {
  n:                         number;
  minNs:                     number;
  maxNs:                     number;
  meanNs:                    number;
  medianNs:                  number;
  p10Ns:                     number;
  p90Ns:                     number;
  stdNs:                     number;

  nominalHz:                 number;
  nominalDtNs:               number;
  jitterWarnThresholdNs:     number;

  zeroOrNegativeDtCount:     number;
  aboveJitterThresholdCount: number;
}

export interface ParseDiagnostics {
  missingRequiredColumns: string[];

  warnings: Array<{
    code:     ParseWarningCode;
    message:  string;
    details?: Record<string, unknown>;
  }>;

  errors: Array<{
    code:     ParseErrorCode;
    message:  string;
    details?: Record<string, unknown>;
  }>;

  invalidByReason: Record<InvalidRowReason, number>;

  captureTime: {
    isMonotonicNonDecreasing:     boolean;
    firstNonMonotonicAtRowIndex?: number;
    nonMonotonicCount:            number;
  };

  dt: DtStats | null;
}

export interface ParseMeta {
  filename?:              string;

  columnsPresent:         string[];
  columnMapping: {
    captureTime:          string;
    gazeStatus:           string;
    combinedGazeForwardX: string;
    combinedGazeForwardY: string;
    combinedGazeForwardZ: string;
  };

  rowCount:               number;
  validRowCount:          number;
  invalidRowCount:        number;

  delimiter: ',' | '\t' | ';' | '|';
  hasBom:                 boolean;

  parsingTimeMs?:         number;
}

export interface ParseGazeCsvResult {
  rows:        RawGazeRow[];
  meta:        ParseMeta;
  diagnostics: ParseDiagnostics;
}

export interface ParseGazeCsvOptions {
  filename?:                     string;

  failOnMissingRequiredColumns?: boolean;                      // default true

  captureTimeMonotonicity?:      'error' | 'warn';             // default warn
  nonMonotonicHandling?:         'invalidateRow' | 'keepRow';  // default invalidateRow

  nominalHz?:                    number;                       // default 200 (or DEFAULT_SAMPLING_RATE_HZ)
  jitterWarnThresholdNs?:        number;                       // default 2_000_000

  delimiter?:                    ',' | '\t' | ';' | '|';      // default ','
  trimWhitespace?:               boolean;                      // default true
}