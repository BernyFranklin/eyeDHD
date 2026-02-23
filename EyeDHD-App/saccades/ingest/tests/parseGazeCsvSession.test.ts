import { describe, it, expect } from 'vitest';

// Implementation will live here later.
// (Keep this import commented until parseGazeCsvSession exists.)
// import { parseGazeCsvSession } from '../parseGazeCsvSession';

// Optional: once types exist, you can import them for stronger assertions.
import type { ParseGazeCsvOptions, ParseGazeCsvResult } from '../csv/types';

// -------------------------
// Fixtures / helpers
// -------------------------

function csv(lines: string[]): string {
  // Deterministic newlines; trailing newline is fine and common in real files.
  return lines.join('\n') + '\n';
}

/**
 * Minimal header subset for Step 1.
 * (Exact spellings should match real CSV exports.)
 */
const HEADER_MIN = [
  'CaptureTime',
  'GazeStatus',
  'CombinedGazeForwardX',
  'CombinedGazeForwardY',
  'CombinedGazeForwardZ',
].join(',');

/**
 * Helper to create a minimal row with defaults.
 * captureTimeNs is expected to be an integer string in ns.
 */
function rowMin(params: {
  captureTimeNs: number | string;
  gazeStatus?: string;
  x?: number | string;
  y?: number | string;
  z?: number | string;
}): string {
  const {
    captureTimeNs,
    gazeStatus = 'VALID',
    x = 0.1,
    y = 0.2,
    z = 0.3,
  } = params;

  return [
    String(captureTimeNs),
    String(gazeStatus),
    String(x),
    String(y),
    String(z),
  ].join(',');
}

/**
 * Nominal dt at 200 Hz: 5ms => 5,000,000 ns
 */
const DT_NOMINAL_NS = 5_000_000;

describe('CSV Parse + Validate', () => {
  // Note: We’re starting with it.todo so the skeleton can land
  // without breaking CI before the implementation exists.

  describe('A) Column validation', () => {
    it('A1) Parses known-good minimal CSV (3 rows) and returns typed rows + dt stats', () => {
      // Arrange
      const csvText = csv([
        HEADER_MIN,
        rowMin({ captureTimeNs: 0 }),
        rowMin({ captureTimeNs: DT_NOMINAL_NS }),
        rowMin({ captureTimeNs: DT_NOMINAL_NS * 2 }),
      ]);

      // Act
      const result = parseGazeCsvSession(csvText);

      // Assert (contract)
      expect(result.rows).toHaveLength(3);
      expect(result.meta.rowCount).toBe(3);
      expect(result.meta.validRowCount).toBe(3);
      expect(result.meta.invalidRowCount).toBe(0);
      expect(result.diagnostics.missingRequiredColumns).toEqual([]);
      expect(result.diagnostics.captureTime.isMonotonicNonDecreasing).toBe(true);
      //
      // dt stats: 2 intervals each exactly 5,000,000ns
      expect(result.diagnostics.dt?.n).toBe(2);
      expect(result.diagnostics.dt?.meanNs).toBe(DT_NOMINAL_NS);
      expect(result.diagnostics.dt?.medianNs).toBe(DT_NOMINAL_NS);
      expect(result.diagnostics.warnings).toHaveLength(0);
      expect(result.diagnostics.errors).toHaveLength(0);
    });

    it('A2) Missing required column -> reports MISSING_REQUIRED_COLUMNS and returns no rows (failOnMissingRequiredColumns=true)', () => {
      // Arrange: remove CombinedGazeForwardZ
      const headerMissingZ = [
        'CaptureTime',
        'GazeStatus',
        'CombinedGazeForwardX',
        'CombinedGazeForwardY',
        // 'CombinedGazeForwardZ',
      ].join(',');

      const csvText = csv([
        headerMissingZ,
        // row shape here is still 5 cols if present in raw file; but header lacks Z
        // Keep it simple for now: match header length to avoid ambiguity.
        ['0', 'VALID', '0.1', '0.2'].join(','),
      ]);

      // Act
      const result = parseGazeCsvSession(csvText, { failOnMissingRequiredColumns: true });

      // Assert (contract)
      expect(result.rows).toHaveLength(0);
      expect(result.diagnostics.errors.some(e => e.code === 'MISSING_REQUIRED_COLUMNS')).toBe(true);
      expect(result.diagnostics.missingRequiredColumns).toContain('CombinedGazeForwardZ');
    });
  });

  describe('B) Type coercion + invalid counters', () => {
    it('B1) Non-numeric CaptureTime -> counts NON_NUMERIC_CAPTURE_TIME and excludes row from output', () => {
      // Arrange
      const csvText = csv([
        HEADER_MIN,
        rowMin({ captureTimeNs: 0 }),
        rowMin({ captureTimeNs: 'abc' }), // invalid
        rowMin({ captureTimeNs: DT_NOMINAL_NS * 2 }),
      ]);

      // Act
      const result = parseGazeCsvSession(csvText);

      // Assert
      expect(result.meta.rowCount).toBe(3);
      expect(result.meta.invalidRowCount).toBe(1);
      expect(result.diagnostics.invalidByReason.NON_NUMERIC_CAPTURE_TIME).toBe(1);
      expect(result.rows).toHaveLength(2);
    });

    it('B2) Blank forward component -> counts MISSING_FORWARD_X and excludes row', () => {
      // Arrange: blank X
      const blankX = ['0', 'VALID', '', '0.2', '0.3'].join(',');
      const csvText = csv([
        HEADER_MIN,
        blankX,
      ]);

      // Act
      const result = parseGazeCsvSession(csvText);

      // Assert
      expect(result.meta.invalidRowCount).toBe(1);
      expect(result.diagnostics.invalidByReason.MISSING_FORWARD_X).toBe(1);
      expect(result.rows).toHaveLength(0);
    });

    it('B3) Non-finite forward component (Infinity/NaN) -> counts NON_FINITE_FORWARD_X and excludes row', () => {
      const infX = ['0', 'VALID', 'Infinity', '0.2', '0.3'].join(',');
      const csvText = csv([
        HEADER_MIN,
        infX,
      ]);

      const result = parseGazeCsvSession(csvText);

      expect(result.meta.invalidRowCount).toBe(1);
      expect(result.diagnostics.invalidByReason.NON_FINITE_FORWARD_X).toBe(1);
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('C) CaptureTime monotonicity', () => {
    it('C1) Non-monotonic CaptureTime -> counts NON_MONOTONIC_CAPTURE_TIME, marks diagnostic, invalidates offending row by default', () => {
      // Arrange: 0, 5ms, 3ms (non-monotonic), 10ms
      const csvText = csv([
        HEADER_MIN,
        rowMin({ captureTimeNs: 0 }),
        rowMin({ captureTimeNs: DT_NOMINAL_NS }),
        rowMin({ captureTimeNs: DT_NOMINAL_NS - 2_000_000 }), // goes backwards
        rowMin({ captureTimeNs: DT_NOMINAL_NS * 2 }),
      ]);

      // Act
      const result = parseGazeCsvSession(csvText);

      // Assert
      expect(result.diagnostics.captureTime.isMonotonicNonDecreasing).toBe(false);
      expect(result.diagnostics.captureTime.nonMonotonicCount).toBe(1);
      expect(result.diagnostics.invalidByReason.NON_MONOTONIC_CAPTURE_TIME).toBe(1);
      expect(result.rows).toHaveLength(3); // 4 input rows - 1 invalidated
      expect(result.diagnostics.warnings.some(w => w.code === '...')).toBe(true); // if you add a specific warning
    });

    it('C2) captureTimeMonotonicity="error" -> adds an error entry (deterministic) when non-monotonic occurs', () => {
      // Arrange
      const csvText = csv([
        HEADER_MIN,
        rowMin({ captureTimeNs: 0 }),
        rowMin({ captureTimeNs: 10 }),
        rowMin({ captureTimeNs: 5 }), // backwards
      ]);

      // Act
      const result = parseGazeCsvSession(csvText, {
        captureTimeMonotonicity: 'error',
      });

      // Assert
      expect(result.diagnostics.errors.length).toBeGreaterThan(0);
      // (Whether rows are returned is part of the contract we’ll lock in.)
    });
  });

  describe('D) dt stats + jitter warnings', () => {
    it('D1) Irregular dt beyond threshold -> emits IRREGULAR_DT_JITTER warning and increments aboveJitterThresholdCount', () => {
      // Arrange: 0, 5ms, 20ms (dt=15ms is highly irregular)
      const csvText = csv([
        HEADER_MIN,
        rowMin({ captureTimeNs: 0 }),
        rowMin({ captureTimeNs: DT_NOMINAL_NS }),
        rowMin({ captureTimeNs: DT_NOMINAL_NS * 4 }),
      ]);

      // Act
      const result = parseGazeCsvSession(csvText, {
        nominalHz: 200,
        jitterWarnThresholdNs: 2_000_000,
      });

      // Assert
      expect(result.diagnostics.warnings.some(w => w.code === 'IRREGULAR_DT_JITTER')).toBe(true);
      expect(result.diagnostics.dt?.aboveJitterThresholdCount).toBe(1);
      expect(result.diagnostics.dt?.n).toBe(2);
    });

    it('D2) dt stats computed from consecutive emitted rows only (invalid rows break pairs)', () => {
      // Arrange: valid, invalid (bad capture time), valid
      const csvText = csv([
        HEADER_MIN,
        rowMin({ captureTimeNs: 0 }),
        rowMin({ captureTimeNs: 'abc' }), // invalid row removed
        rowMin({ captureTimeNs: DT_NOMINAL_NS * 2 }),
      ]);

      // Act
      const result = parseGazeCsvSession(csvText);

      // Assert: dt samples should be based on consecutive emitted rows.
      // With 2 emitted rows total -> dt.n should be 1.
      expect(result.rows).toHaveLength(2);
      expect(result.diagnostics.dt?.n).toBe(1);
    });
  });

  describe('E) Empty inputs', () => {
    it('E1) Empty file -> EMPTY_FILE warning, no rows, meta rowCount=0', () => {
      const csvText = '';

      const result = parseGazeCsvSession(csvText);

      expect(result.rows).toHaveLength(0);
      expect(result.meta.rowCount).toBe(0);
      expect(result.diagnostics.warnings.some(w => w.code === 'EMPTY_FILE')).toBe(true);
    });

    it('E2) Header-only -> HAS_HEADER_ONLY warning, no rows, columnsPresent populated', () => {
      const csvText = csv([HEADER_MIN]);

      const result = parseGazeCsvSession(csvText);

      expect(result.rows).toHaveLength(0);
      expect(result.meta.rowCount).toBe(0);
      expect(result.meta.columnsPresent.length).toBeGreaterThan(0);
      expect(result.diagnostics.warnings.some(w => w.code === 'HAS_HEADER_ONLY')).toBe(true);
    });
  });

  // A tiny “sanity check” that can run even before implementation exists.
  // This helps confirm fixtures behave as expected.
  describe('Z) Fixture sanity', () => {
    it('Z1) csv() helper appends a trailing newline deterministically', () => {
      const text = csv(['a,b', '1,2']);
      expect(text.endsWith('\n')).toBe(true);
      expect(text).toBe('a,b\n1,2\n');
    });
  });
});