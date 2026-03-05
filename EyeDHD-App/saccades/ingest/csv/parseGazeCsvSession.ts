import { DEFAULT_SAMPLING_RATE_HZ } from '@saccades/index';
import type {
  DtStats,
  InvalidRowReason,
  ParseDiagnostics,
  ParseGazeCsvOptions,
  ParseGazeCsvResult,
  ParseMeta,
  RawGazeRow,
} from './types';

// Columns required for Step 1 parsing (basic gaze data). 
// Exact spellings should match real CSV exports.
const REQUIRED_COLUMNS = [
  'CaptureTime',
  'GazeStatus',
  'CombinedGazeForwardX',
  'CombinedGazeForwardY',
  'CombinedGazeForwardZ',
] as const;

// Nanoseconds per sample from sampling rate (Hz). For 200Hz => 5,000,000ns.
function nsPerSampleFromHz(hz: number): number {
  return Math.round(1_000_000_000 / hz);                                    // 1e9 ns/sec divided by hz. For 200Hz => 5,000,000ns.
}

function median(sorted: number[]): number {
  const n = sorted.length;                                                  // Get length of the sorted array
  if (n === 0) return NaN;                                                  // Handle empty array case
  const mid = Math.floor(n / 2);                                            // Calculate middle index
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;   // Return median value
}

function percentile(sorted: number[], p: number): number {
  // Simple linear interpolation percentile (deterministic).
  if (sorted.length === 0) return NaN;                                      // Handle empty array case
  const idx = (sorted.length - 1) * p;                                      // Calculate the index for the p-th percentile
  const lo = Math.floor(idx);                                               // Get the lower index
  const hi = Math.ceil(idx);                                                // Get the upper index
  if (lo === hi) return sorted[lo];                                         // If the index is an integer, return the value at that index
  const t = idx - lo;                                                       // Calculate the fractional part for interpolation
  return sorted[lo] * (1 - t) + sorted[hi] * t;                             // Return the interpolated percentile value
}

function stdPopulation(values: number[], mean: number): number {
  if (values.length === 0) return NaN;                                      // Handle empty array case
  let acc = 0;                                                              // Accumulator for squared differences
  for (const v of values) {                                                 // Iterate over each value in the array
    const d = v - mean;                                                     // Calculate the difference from the mean
    acc += d * d;                                                           // Accumulate the squared difference
  }
  return Math.sqrt(acc / values.length);                                    // Return the population standard deviation
}

function initInvalidCounters(): Record<InvalidRowReason, number> {
  // Keep explicit for stability (no missing keys).
  return {
    EMPTY_ROW: 0,
    MISSING_CAPTURE_TIME: 0,
    NON_NUMERIC_CAPTURE_TIME: 0,
    NON_INTEGER_CAPTURE_TIME: 0,
    NEGATIVE_CAPTURE_TIME: 0,
    MISSING_GAZE_STATUS: 0,
    MISSING_FORWARD_X: 0,
    MISSING_FORWARD_Y: 0,
    MISSING_FORWARD_Z: 0,
    NON_NUMERIC_FORWARD_X: 0,
    NON_NUMERIC_FORWARD_Y: 0,
    NON_NUMERIC_FORWARD_Z: 0,
    NON_FINITE_FORWARD_X: 0,
    NON_FINITE_FORWARD_Y: 0,
    NON_FINITE_FORWARD_Z: 0,
    NON_MONOTONIC_CAPTURE_TIME: 0,
  };
}

function normalizeCell(cell: string, trim: boolean): string {
  return trim ? cell.trim() : cell;                                         // Optionally trim whitespace from cells (default true).
}

function splitLines(csvText: string): string[] {
  // Normalize Windows newlines and trim only trailing empty lines
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');   // Split into lines. 
  const lines = normalized.split('\n');                                     // If the file ends with newline, split gives a trailing "" — drop trailing empties.
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();   // Remove trailing empty lines caused by final newline(s).
  return lines;                                                             // Return array of lines without trailing empty lines.
}

export function parseGazeCsvSession(
  csvText: string,
  options: ParseGazeCsvOptions = {}
): ParseGazeCsvResult {
  const delimiter = options.delimiter ?? ',';                                         // Default to comma
  const trim = options.trimWhitespace ?? true;                                        // Default to trimming whitespace

  const nominalHz = options.nominalHz ?? DEFAULT_SAMPLING_RATE_HZ;                    // Default nominal sampling rate (Hz) for dt stats.
  const nominalDtNs = nsPerSampleFromHz(nominalHz);                                   // Calculate nominal dt in nanoseconds from nominalHz 
  const jitterWarnThresholdNs = options.jitterWarnThresholdNs ?? 2_000_000;           // Default jitter warning threshold in nanoseconds (e.g., 2ms = 2,000,000ns).

  const failOnMissingRequiredColumns = options.failOnMissingRequiredColumns ?? true;  // Default to failing on missing required columns 
  const captureTimeMonotonicity = options.captureTimeMonotonicity ?? 'warn';          // Default to warning on non-monotonic CaptureTime (vs error)
  const nonMonotonicHandling = options.nonMonotonicHandling ?? 'invalidateRow';       // Default to invalidating rows with non-monotonic CaptureTime (vs keeping them)

  const hasBom = csvText.charCodeAt(0) === 0xfeff;                                    // Check for UTF-8 BOM (Byte Order Mark) at the start of the text. 
  const text = hasBom ? csvText.slice(1) : csvText;                                   // Remove BOM if present for further processing.

  const invalidByReason = initInvalidCounters();                                      // Initialize counters for invalid rows by reason.

  const diagnostics: ParseDiagnostics = {                                             // Initialize diagnostics object to collect parsing information, warnings, and errors.
    missingRequiredColumns: [],
    warnings: [],
    errors: [],
    invalidByReason,
    captureTime: {
      isMonotonicNonDecreasing: true,
      nonMonotonicCount: 0,
    },
    dt: null,
  };

  const metaBase: Omit<ParseMeta, 'rowCount' | 'validRowCount' | 'invalidRowCount' | 'columnsPresent' | 'columnMapping'> = {
    filename: options.filename,
    delimiter,
    hasBom,
  };

  const lines = splitLines(text);                      // Split the input CSV text into lines, normalizing newlines and removing trailing empty lines.

  if (lines.length === 0) {                            // Handle empty file case: no lines at all (not even header)
    diagnostics.warnings.push({                        // Add a warning about empty file.
      code: 'EMPTY_FILE',
      message: 'CSV text is empty.',
    });

    const meta: ParseMeta = {                          // For empty file, we have no columns, and zero rows.
      ...metaBase,
      columnsPresent: [],
      columnMapping: {
        captureTime: 'CaptureTime',
        gazeStatus: 'GazeStatus',
        combinedGazeForwardX: 'CombinedGazeForwardX',  
        combinedGazeForwardY: 'CombinedGazeForwardY',
        combinedGazeForwardZ: 'CombinedGazeForwardZ',
      },
      rowCount: 0,
      validRowCount: 0,
      invalidRowCount: 0,
    };

    return { rows: [], meta, diagnostics };            // Return early with empty results for empty file.
  }

  const headerLine = lines[0];                                                         // The first line is expected to be the header. 
  const headerCells = headerLine.split(delimiter).map((c) => normalizeCell(c, trim));  // Split the header line into cells and normalize them 
  const columnsPresent = headerCells;                                                  // Keep the original header cells as columnsPresent

  const colIndex: Record<string, number> = {};                                         // Map column names to their index for quick lookup.
  for (let i = 0; i < headerCells.length; i++) {                                       // Build the column index mapping from column name to its position in the header.
    colIndex[headerCells[i]] = i;                                                      // Map the column name to its index in the header for later use when parsing rows.
  }

  const missing = REQUIRED_COLUMNS.filter((c) => colIndex[c] === undefined);           // Check for missing required columns by verifying if each required column is present in the header.
  diagnostics.missingRequiredColumns = missing.slice();                                // Store the list of missing required columns in diagnostics for reporting.

  const meta: ParseMeta = {                                                            // Base metadata extracted from the header and options. Row counts will be filled in during parsing.
    ...metaBase,
    columnsPresent,
    columnMapping: {
      captureTime: 'CaptureTime',
      gazeStatus: 'GazeStatus',
      combinedGazeForwardX: 'CombinedGazeForwardX',
      combinedGazeForwardY: 'CombinedGazeForwardY',
      combinedGazeForwardZ: 'CombinedGazeForwardZ',
    },
    rowCount: Math.max(0, lines.length - 1),
    validRowCount: 0,
    invalidRowCount: 0,
  };

  if (missing.length > 0) {                                                            // If there are missing required columns, add an error to diagnostics and optionally return early with no rows.
    diagnostics.errors.push({
      code: 'MISSING_REQUIRED_COLUMNS',
      message: `Missing required columns: ${missing.join(', ')}`,
      details: { missingRequiredColumns: missing },
    });

    if (failOnMissingRequiredColumns) {                                                // If the option to fail on missing required columns is true, return early with no diagnostics.
      return { rows: [], meta: { ...meta, validRowCount: 0, invalidRowCount: meta.rowCount }, diagnostics };
    }
  }

  if (lines.length === 1) {                                                  // If there's only a header and no data rows, add a warning
    diagnostics.warnings.push({                                              // Warn that the CSV has a header but no data rows.
      code: 'HAS_HEADER_ONLY',
      message: 'CSV has a header row but no data rows.',
    });
    return { rows: [], meta, diagnostics };                                  // Return early with no rows but include the warning and metadata about the header.
  }

  const rows: RawGazeRow[] = [];                                             // Initialize an array to hold the valid parsed rows of gaze data.
  let lastCaptureTimeNs: number | null = null;                               // Keep track of the last CaptureTime in nanoseconds for monotonicity checks.

  for (let rowIndex = 0; rowIndex < lines.length - 1; rowIndex++) {          // Iterate over each data line (starting from index 1 since index 0 is the header).
    const line = lines[rowIndex + 1];                                        // Adjust index to account for header line at index 0.
    if (line.trim() === '') {                                                // If the line is empty or only whitespace, count it as an empty row and skip it.
      invalidByReason.EMPTY_ROW++;
      meta.invalidRowCount++;
      continue;
    }

    const cells = line.split(delimiter).map((c) => normalizeCell(c, trim));  // Split the line into cells and normalize them 

    const get = (col: string): string => {                                   // Helper function to get the cell value for a given column name
      const idx = colIndex[col];                                             // Look up the column index for the given column name using the colIndex mapping.
      if (idx === undefined) return '';                                      // If the column is missing from the header, return an empty string 
      return cells[idx] ?? '';                                               // Return the cell value at the column index, or an empty string if the index is out of bounds for this row.
    };

    const captureTimeRaw = get('CaptureTime');                               // Get the raw string value for the CaptureTime column using the helper function.
    const gazeStatusRaw = get('GazeStatus');                                 // Get the raw string value for the GazeStatus column using the helper function.
    const xRaw = get('CombinedGazeForwardX');                                // Get the raw string value for the CombinedGazeForwardX column using the helper function.
    const yRaw = get('CombinedGazeForwardY');                                // Get the raw string value for the CombinedGazeForwardY column using the helper function.
    const zRaw = get('CombinedGazeForwardZ');                                // Get the raw string value for the CombinedGazeForwardZ column using the helper function.

    // ---- Validate presence (deterministic priority) ----
    if (captureTimeRaw === '') {               // If the CaptureTime cell is empty, count it as a missing CaptureTime and skip the row.
      invalidByReason.MISSING_CAPTURE_TIME++;
      meta.invalidRowCount++;
      continue;
    }
    if (gazeStatusRaw === '') {                // If the GazeStatus cell is empty, count it as a missing GazeStatus and skip the row.
      invalidByReason.MISSING_GAZE_STATUS++;
      meta.invalidRowCount++;
      continue;
    }
    if (xRaw === '') {                        // If the CombinedGazeForwardX cell is empty, count it as a missing forward X and skip the row.
      invalidByReason.MISSING_FORWARD_X++;
      meta.invalidRowCount++;
      continue;
    }
    if (yRaw === '') {                        // If the CombinedGazeForwardY cell is empty, count it as a missing forward Y and skip the row.
      invalidByReason.MISSING_FORWARD_Y++;
      meta.invalidRowCount++;
      continue;
    }
    if (zRaw === '') {                        // If the CombinedGazeForwardZ cell is empty, count it as a missing forward Z and skip the row.
      invalidByReason.MISSING_FORWARD_Z++;
      meta.invalidRowCount++;
      continue;
    }

    // ---- Parse CaptureTime (int) ----
    // Require integer string (no decimals).
    if (!/^-?\d+$/.test(captureTimeRaw)) {
      if (/^-?\d+(\.\d+)$/.test(captureTimeRaw)) {   // Distinguish “numeric but not integer” vs non-numeric
        invalidByReason.NON_INTEGER_CAPTURE_TIME++;  // If it looks like a number but has decimals, count it as non-integer CaptureTime.
      } else {
        invalidByReason.NON_NUMERIC_CAPTURE_TIME++;  // Otherwise, count it as non-numeric CaptureTime.
      }
      meta.invalidRowCount++;                        // In either case, count the row as invalid and skip it.
      continue;
    }

    const captureTimeNs = Number(captureTimeRaw);    // Convert the CaptureTime string to a number (in nanoseconds).
    if (!Number.isFinite(captureTimeNs)) {           // If the CaptureTime is not a finite number 
      invalidByReason.NON_NUMERIC_CAPTURE_TIME++;    // Increment the counter for non-numeric CaptureTime
      meta.invalidRowCount++;                        // Increment the invalid row count in metadata
      continue;                                      // Skip processing this row and move to the next iteration of the loop.
    }
    if (!Number.isInteger(captureTimeNs)) {          // If the CaptureTime is not an integer
      invalidByReason.NON_INTEGER_CAPTURE_TIME++;    // Increment the counter for non-integer CaptureTime
      meta.invalidRowCount++;                        // Increment the invalid row count in metadata
      continue;                                      // Skip processing this row and move to the next iteration of the loop.
    }
    if (captureTimeNs < 0) {                         // If the CaptureTime is negative
      invalidByReason.NEGATIVE_CAPTURE_TIME++;       // Increment the counter for negative CaptureTime
      meta.invalidRowCount++;                        // Increment the invalid row count in metadata
      continue;                                      // Skip processing this row and move to the next iteration of the loop.
    }

    // ---- Parse forward vector floats ----
    const x = Number(xRaw);
    const y = Number(yRaw);
    const z = Number(zRaw);
    // Helper function to check if a value is a valid finite number, and return the appropriate reason for invalidity if not. 
    const checkFloat = (v: number, nonNumericReason: InvalidRowReason, nonFiniteReason: InvalidRowReason): InvalidRowReason | null => {
      if (Number.isNaN(v)) return nonNumericReason;
      if (!Number.isFinite(v)) return nonFiniteReason;
      return null;
    };
    
    const rx = checkFloat(x, 'NON_NUMERIC_FORWARD_X', 'NON_FINITE_FORWARD_X');  // Check if the X component is a valid finite number
    if (rx) {                                                                   // If the X component is invalid
      invalidByReason[rx]++;                                                    // Increment the appropriate counter for the reason of invalidity (non-numeric or non-finite)
      meta.invalidRowCount++;                                                   // Increment the invalid row count in metadata
      continue;                                                                 // Skip processing this row and move to the next iteration of the loop.
    }
    const ry = checkFloat(y, 'NON_NUMERIC_FORWARD_Y', 'NON_FINITE_FORWARD_Y');  // Check if the Y component is a valid finite number
    if (ry) {                                                                   // If the Y component is invalid
      invalidByReason[ry]++;                                                    // Increment the appropriate counter for the reason of invalidity (non-numeric or non-finite)
      meta.invalidRowCount++;                                                   // Increment the invalid row count in metadata
      continue;                                                                 // Skip processing this row and move to the next iteration of the loop.
    }
    const rz = checkFloat(z, 'NON_NUMERIC_FORWARD_Z', 'NON_FINITE_FORWARD_Z');  // Check if the Z component is a valid finite number
    if (rz) {                                                                   // If the Z component is invalid
      invalidByReason[rz]++;                                                    // Increment the appropriate counter for the reason of invalidity (non-numeric or non-finite)
      meta.invalidRowCount++;                                                   // Increment the invalid row count in metadata
      continue;                                                                 // Skip processing this row and move to the next iteration of the loop.
    }

    // ---- Monotonicity check ----
    if (lastCaptureTimeNs !== null && captureTimeNs < lastCaptureTimeNs) {
      invalidByReason.NON_MONOTONIC_CAPTURE_TIME++;
      meta.invalidRowCount++;

      diagnostics.captureTime.isMonotonicNonDecreasing = false;
      diagnostics.captureTime.nonMonotonicCount++;
      if (diagnostics.captureTime.firstNonMonotonicAtRowIndex === undefined) {  //If this is the first time we've seen a non-monotonic CaptureTime
        diagnostics.captureTime.firstNonMonotonicAtRowIndex = rowIndex;         // Record the row index of the first occurrence for diagnostics.
      }

      if (captureTimeMonotonicity === 'error') {                                // If the option is set to treat non-monotonic CaptureTime as an error
        diagnostics.errors.push({                                               // Add an error entry to diagnostics with details about the non-monotonic CaptureTime occurrence
          code: 'CSV_PARSE_FAILED',
          message: 'Non-monotonic CaptureTime encountered.',
          details: { rowIndex, lastCaptureTimeNs, captureTimeNs },
        });
      }

      if (nonMonotonicHandling === 'invalidateRow') {                           // If the option is set to invalidate rows with non-monotonic CaptureTime
        continue;                                                               // Do not emit row, and do not update lastCaptureTimeNs.
      }
                                                                                // else keepRow: fall through and emit it
    }

    const typedRow: RawGazeRow = {                                              // If we've made it here, the row is valid and we can construct a typed row object with the parsed values.
      rowIndex,
      captureTimeNs,
      gazeStatus: gazeStatusRaw,
      combinedGazeForward: { x, y, z },
    };

    rows.push(typedRow);                                                        // Add the valid typed row to the array of rows to be returned in the result.
    meta.validRowCount++;                                                       // Increment the valid row count in metadata
    lastCaptureTimeNs = captureTimeNs;                                          // Update the last CaptureTime for monotonicity checks on subsequent rows.
  }

  // ---- dt stats from consecutive emitted rows ----
  if (rows.length >= 2) {                                                       // We can only compute dt stats if we have at least 2 valid rows to compare.
    const dts: number[] = [];                                                   // Array to hold the computed dt values between consecutive CaptureTime entries.
    let zeroOrNegativeDtCount = 0;                                              // Counter for dt values that are zero or negative
    let aboveJitterThresholdCount = 0;                                          // Counter for dt values that deviate from the nominal dt by more than the jitter warning threshold

    for (let i = 1; i < rows.length; i++) {                                                 // Iterate over the valid rows starting from the second row to compute dt between consecutive rows
      const dt = rows[i].captureTimeNs - rows[i - 1].captureTimeNs;                         // Compute the difference in CaptureTime (dt) between the current row and the previous row
      dts.push(dt);                                                                         // Add the computed dt to the array of dt values for later statistical analysis

      if (dt <= 0) zeroOrNegativeDtCount++;                                                 // Increment the counter if the dt is zero or negative
      if (Math.abs(dt - nominalDtNs) > jitterWarnThresholdNs) aboveJitterThresholdCount++;  // Increment the counter if the absolute deviation of dt from the nominal dt exceeds the jitter warning
    }

    const sorted = dts.slice().sort((a, b) => a - b);   // Create a sorted copy of the dt array for computing median, percentiles, and other statistics that require sorted data.
    const n = sorted.length;                            // Get the number of dt samples for computing statistics.

    let sum = 0;                                        // Initialize the sum of dt values for calculating the mean. 
    for (const v of sorted) sum += v;                   // Compute the sum of all dt values in the sorted array to later calculate the mean dt.
    const meanNs = sum / n;                             // Calculate the mean dt in nanoseconds by dividing the total sum of dt values by the number of samples (n).

    const dtStats: DtStats = {                          // Construct the dtStats object with all the computed statistics about the dt values
      n,
      minNs: sorted[0],
      maxNs: sorted[sorted.length - 1],
      meanNs,
      medianNs: median(sorted),
      p10Ns: percentile(sorted, 0.10),
      p90Ns: percentile(sorted, 0.90),
      stdNs: stdPopulation(sorted, meanNs),

      nominalHz,
      nominalDtNs,
      jitterWarnThresholdNs,

      zeroOrNegativeDtCount,
      aboveJitterThresholdCount,
    };

    diagnostics.dt = dtStats;                           // Attach the computed dt statistics to the diagnostics object in the result for reporting and analysis.

    if (aboveJitterThresholdCount > 0) {                // If there are any dt samples that deviate beyond the jitter warning threshold
      diagnostics.warnings.push({                       // Add a warning entry to diagnostics with details about the irregular dt samples that exceed the jitter threshold
        code: 'IRREGULAR_DT_JITTER',
        message: 'One or more dt samples deviate beyond jitter threshold.',
        details: {
          aboveJitterThresholdCount,
          jitterWarnThresholdNs,
          nominalDtNs,
          nominalHz,
        },
      });
    }
  } else {
    diagnostics.dt = null;                               // If there are no valid dt samples, set the dt statistics in diagnostics to null.
  }

  return { rows, meta, diagnostics };                    // Return the processed rows, metadata, and diagnostics information
}