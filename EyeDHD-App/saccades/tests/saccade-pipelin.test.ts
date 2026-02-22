import { describe, it, expect } from 'vitest';
import { analyzeSaccadesFromVectors } from '../index';
import type { Vec3 } from '../index';

// Helper function to create a Vec3 representing a rotation around the Y-axis by a given angle in degrees.
function rotateYDeg(angleDeg: number): Vec3 {
    const rad = (angleDeg * Math.PI) / 180;
    return {
        x: Math.sin(rad),
        y: 0,
        z: Math.cos(rad),
    };
}

// Helper function for stable sorting
function stableChronoSortSec<T extends { startTimeSec: number, endTimeSec: number }>(items: T[]): T[] {
    return items
    .map((item, i) => ({ item, i}))
    .sort((a, b) => {
        if (a.item.startTimeSec !== b.item.startTimeSec) return a.item.startTimeSec - b.item.startTimeSec;
        if (a.item.endTimeSec !== b.item.endTimeSec) return a.item.endTimeSec - b.item.endTimeSec;
        return a.i - b.i;
    })
    .map(x => x.item);
}

// Helper function to assert that the perSaccade output is in stable chronological order and aligns with related outputs
function assertStableOrder(result: ReturnType<typeof analyzeSaccadesFromVectors>) {
  const per = result.metrics.perSaccade;
  const rows = result.metrics.perSaccadeRows;
  const rateSeries = result.metrics.series.saccadeRatePerSecOverTime;
  const ampSeries = result.metrics.series.amplitudeDegOverTime;

  // perSaccade monotonic (startTime, then endTime)
  for (let i = 1; i < per.length; i++) {
    const prev = per[i - 1];
    const cur = per[i];
    const ok =
      cur.startTime > prev.startTime ||
      (cur.startTime === prev.startTime && cur.endTime >= prev.endTime);
    expect(ok).toBe(true);
  }

  // rows align with per
  expect(rows.length).toBe(per.length);
  for (let i = 0; i < per.length; i++) {
    expect(rows[i].startTime).toBe(per[i].startTime);
    expect(rows[i].endTime).toBe(per[i].endTime);
  }

  // series align with per
  expect(rateSeries.length).toBe(per.length);
  expect(ampSeries.length).toBe(per.length);
  for (let i = 0; i < per.length; i++) {
    expect(rateSeries[i].x).toBe(per[i].startTime);
    expect(ampSeries[i].x).toBe(per[i].startTime);
  }
}

describe('Saccade Pipeline (Integration)', () => {
    describe('A) Core End-to-End Pipeline Integrity', () => {
        it('A1) Minimal end-to-end detection with default options', () => {
            // Deterministic dataset @ 200 Hz (dt = 5ms).
            const vectors: Vec3[] = [];

            // Pre-hold: 20 samples at 0°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));
            // Movement: 10 steps of 0.6° => total ~6.0°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));
            // Post-hold: 20 samples at 6°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(6.0));

            const result = analyzeSaccadesFromVectors(vectors);

            // Detection sanity 
            expect(result.detection.saccades.length).toBeGreaterThanOrEqual(1);
            // Filtering transparency + pipeline consistency
            const filtered = result.metrics.filtered;
            // Sum(byReason) must equal totalFiltered
            const sumReasons = Object.values(filtered.byReason).reduce((a, b) => a + b, 0);
            expect(sumReasons).toBe(filtered.totalFiltered);
            // (kept + filtered) must equal number of detected events passed into metrics
            expect(result.metrics.perSaccade.length + filtered.totalFiltered).toBe(
                result.detection.saccades.length
            );
            // Kept saccade correctness (choose the largest-amplitude kept saccade)
            // This makes the test robust even if tiny boundary artifacts exist.
            expect(result.metrics.perSaccade.length).toBeGreaterThanOrEqual(1);
            const keptMaxAmp = result.metrics.perSaccade.reduce((best, cur) =>
                cur.amplitudeDeg > best.amplitudeDeg ? cur : best
            );
            // Your observed boundary convention yields 45ms for this construction.
            expect(keptMaxAmp.durationMs).toBe(45);
            expect(keptMaxAmp.durationSec).toBeCloseTo(0.045, 6);
            // Amplitude should be ~6°
            expect(keptMaxAmp.amplitudeDeg).toBeCloseTo(6, 2);
            // ratePerSec = amplitude / durationSec ≈ 6 / 0.045 = 133.333...
            expect(keptMaxAmp.ratePerSec).toBeCloseTo(133.3333333333, 3);
            // Explicit sec -> ms conversion guarantee
            // Find the corresponding detected event by closest amplitude (since detection->metrics maps amplitude directly).
            const detectedClosest = result.detection.saccades.reduce((best, cur) => {
                const db = Math.abs(best.amplitudeDeg - keptMaxAmp.amplitudeDeg);
                const dc = Math.abs(cur.amplitudeDeg - keptMaxAmp.amplitudeDeg);
                return dc < db ? cur : best;
            });
            expect(keptMaxAmp.startTime).toBeCloseTo(detectedClosest.startTimeSec * 1000, 6);
            expect(keptMaxAmp.endTime).toBeCloseTo(detectedClosest.endTimeSec * 1000, 6);
            // ISI sanity (single kept event => no ISI)
            // (Even if multiple events are detected, if only one is kept, isiSeries must be empty.)
            expect(result.metrics.isiSeries.length).toBe(
                Math.max(0, result.metrics.perSaccade.length - 1)
            );
        });

        it('A2) Handles no-saccade input without error', () => {
            // Deterministic dataset designed to stay below default thresholds.
            const vectors: Vec3[] = [];
            const stepDeg = 0.2; // Small steps to avoid crossing amplitude threshold

            // Gradual smooth motion for 60 samples
            for (let i = 0; i < 60; i++) vectors.push(rotateYDeg(i * stepDeg));

            const result = analyzeSaccadesFromVectors(vectors);

            // Detection
            expect(result.detection.saccades.length).toBe(0);
            expect(result.detection.saccadesExtended.length).toBe(0);
            // Metrics
            expect(result.metrics.perSaccade.length).toBe(0);
            // No filtering because theres no events to filter
            expect(result.metrics.filtered.totalFiltered).toBe(0);
            expect(result.metrics.filtered.byReason).toEqual({
                amplitude_out_of_bounds: 0,
                duration_out_of_bounds: 0,
            });
            // Session metrics should be the empty-session contract
            expect(result.metrics.session.durationMs).toBe(0);
            expect(result.metrics.session.durationSec).toBe(0);
            expect(result.metrics.session.ratePerSec).toBe(0);
            // Distributions for empty input return zeros
            expect(result.metrics.session.distributions.amplitudeDeg).toEqual({
                min:    0,
                max:    0,
                mean:   0,
                median: 0,
                p10:    0,
                p50:    0,
                p90:    0,
                std:    0,
            });
            // ISI should be empty
            expect(result.metrics.isiSeries.length).toBe(0);
            expect(result.metrics.isiFiltered.totalFiltered).toBe(0);
            expect(result.metrics.isiFiltered.byReason).toEqual({});
            expect(result.metrics.isiDistributions.isiMs).toEqual({
                min:    0,
                max:    0,
                mean:   0,
                median: 0,
                p10:    0,
                p50:    0,
                p90:    0,
                std:    0,
            });
            // No series / csv outputs requested --> should be empty/null by default
            expect(result.metrics.series.saccadeRatePerSecOverTime.length).toBe(0);
            expect(result.metrics.series.amplitudeDegOverTime.length).toBe(0);
            expect(result.metrics.perSaccadeRows.length).toBe(0);
            expect(result.metrics.csv.sessionSummaryRow).toBeNull();
            expect(result.metrics.csv.segmentSummaryRows.length).toBe(0);
        });

        it('A3) Multiple saccades propagate correctly and ISI is computed from kept events', () => {
            /**
             * Build two clear saccades separated by a fixed hold (so ISI is predictable).
             * dt = 5ms (200 Hz).
             *
             * Saccade construction (same pattern as A1):
             * - Step 0.6° per sample => 120°/s during movement (above 100°/s threshold)
             * - Your detector convention yields ~45ms duration for this pattern.
             *
             * Plan:
             * 1) Hold at 0°
             * 2) Saccade 1: 0° -> 6°
             * 3) Hold at 6° for N samples
             * 4) Saccade 2: 6° -> 12°
             * 5) Hold at 12°
             *
             * We assert:
             * - At least 2 detected events (often more due to boundary artifacts)
             * - At least 2 kept saccades
             * - ISI series length == keptCount - 1
             * - ISI value equals (start2 - end1) for the two largest-amplitude kept saccades in time order
             * - Filtering is transparent and consistent: kept + filtered == detected
             */
            const vectors: Vec3[] = [];                                                     // Initialize empty dataset
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));                       // 1. Hold at 0°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));                // 2. Saccade 1: 10 steps of 0.6° => 6.0°, (0.6...6.0)
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(6.0));                     // 3. Hold at 6° for 20 samples (100ms hold)
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(6.0 + k * 0.6));          // 4. Saccade 2: 10 steps of +0.6° => 12.0°, (6.6...12.0)
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(12.0));                    // 5. Hold at 12°
            const result = analyzeSaccadesFromVectors(vectors);                             // Run the pipeline

            // Detection sanity
            expect(result.detection.saccades.length).toBeGreaterThanOrEqual(2);

            // Filtering transparency + pipeline consistency
            const filtered = result.metrics.filtered;                                       // Store filtered metrics for reuse in assertions
            const sumReasons = Object.values(filtered.byReason).reduce((a, b) => a + b, 0); // Sum of filtered by reason
            expect(sumReasons).toBe(filtered.totalFiltered);                                // Total events accounted for in filtering must match sum of reasons
            expect(result.metrics.perSaccade.length + filtered.totalFiltered).toBe(         // Kept + filtered must equal total detected events
                result.detection.saccades.length
            ); 

            // Kept Sanity
            expect(result.metrics.perSaccade.length).toBeGreaterThanOrEqual(2);             // At least 2 kept saccades

            // Ensure chronological ordering
            // Note: perSaccade output is keptOrdered if any series flag is on, otherwise "kept"
            // We won't rely on that toggle here
            const keptChrono = [...result.metrics.perSaccade].sort((a, b) => {              // Sort by start time, then end time for tie-breaking
                if (a.startTime !== b.startTime) return a.startTime - b.startTime;          // Primary sort by start time
                if (a.endTime !== b.endTime) return a.endTime - b.endTime;                  // Secondary sort by end time for tie-breaking 
                return 0;                                                                   // If start and end times are identical, maintain original order (stable sort)
            });

            // Select two biggest-amplitude events in chrono order:
            const strong = keptChrono.filter(s => s.amplitudeDeg >= 5.0);                   // Filter for strong events (should be our two main saccades)
            expect(strong.length).toBeGreaterThanOrEqual(2);                                // Sanity check that we have at least 2 strong events to analyze
            const first = strong[0];                                                        // First strong event in chronological order (should correspond to Saccade 1)
            const second = strong[1];                                                       // Second strong event in chronological order (should correspond to Saccade 2)

            // Each strong saccade should be around 6° amplitude
            expect(first.amplitudeDeg).toBeCloseTo(6.0, 2);                                 // First saccade amplitude should be ~6°
            expect(second.amplitudeDeg).toBeCloseTo(6.0, 2);                                // Second saccade amplitude should be ~6°

            // Durations should match the detector convention (45ms for this construction)
            expect(first.durationMs).toBe(45);                                              // First saccade duration should be 45ms
            expect(second.durationMs).toBe(45);                                             // Second saccade duration should be 45ms

            // ISI correctness
            // ISI series is computed from keptOrdered
            expect(result.metrics.isiSeries.length).toBe(result.metrics.perSaccade.length - 1); // With 2 kept saccades, we should have exactly 1 ISI value

            // Expected ISI for the two strong events
            const expectedIsi = second.startTime - first.endTime;                           // ISI should be the time between the end of the first saccade and the start of the second saccade

            // Find an ISI matching expectedIsi
            const isiMatches = result.metrics.isiSeries.some(                               // Check if the expected ISI value is present in the isiSeries 
                isi => Math.abs(isi - expectedIsi) < 1e-6);
            expect(isiMatches).toBe(true);                                                  // We should find the expected ISI value in the series

            // ISI values should never be negative after filtering
            expect(result.metrics.isiSeries.every(isi => Number.isFinite(isi) && isi >= 0)).toBe(true); // All ISI values should be finite and non-negative
        });
    });

    describe('B) Time Unit & Precision Guarantees', () => {
        it('B1) Correct sec -> ms conversion from detection into metrics input', () => {
            // Intentionally keeping plausible bounds undefined to avoid filtering so every detected saccade becomes a metrics input
            const vectors: Vec3[] = []; // Initialize empty dataset
            // A1 style dataset (will prodce >= 1 detected saccade)
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));         // Hold at 0°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));  // Saccade: 10 steps of 0.6° => 6.0°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(6.0));       // Hold at 6°
            const result = analyzeSaccadesFromVectors(
                vectors, undefined, { series: {amplitudeDegOverTime: true } }
            );
            // Sanity Check
            expect(result.detection.saccades.length).toBeGreaterThanOrEqual(1); // We should have at least 1 detected saccade to validate the conversion
            // No filtering when plausibleBounds are not provided
            expect(result.metrics.filtered.totalFiltered).toBe(0); // With no plausible bounds, we expect no filtering to occur
            // Every detected saccade should appear in perSaccade since nothing is filtered
            expect(result.metrics.perSaccade.length).toBe(result.detection.saccades.length); // All detected saccades should be kept since no filtering occurs

            const detOrdered = stableChronoSortSec(result.detection.saccades); // Sort detected saccades by start time to ensure chronological order
            const metOrdered = result.metrics.perSaccade; // perSaccade should already be in chronological order 
            // Core conversion guarantee: times are multiplied by 1000
            for (let i = 0; i < detOrdered.length; i++) {
                const d = detOrdered[i];
                const m = metOrdered[i];

                expect(m.startTime).toBeCloseTo(d.startTimeSec * 1000, 8); // startTime in ms should be startTimeSec * 1000
                expect(m.endTime).toBeCloseTo(d.endTimeSec * 1000, 8);     // endTime in ms should be endTimeSec * 1000
                // Validate the duration relationship survives conversion
                const detDurationMsFromSec = (d.endTimeSec - d.startTimeSec) * 1000;  // Duration in ms should be (endTimeSec - startTimeSec) * 1000
                expect(m.durationMs).toBeCloseTo(detDurationMsFromSec, 8); // durationMs should match the converted duration from detection
                // Amplitude is passed through unchanged in wrapper
                expect(m.amplitudeDeg).toBeCloseTo(d.amplitudeDeg, 10); // Amplitude should be unchanged by the conversion
            }
        });

        it('B2) High-precision inputs do not create non-finite values, negative durations, or negative ISIs', () => {
            // Precision stress:
            // Long run of tiny sub-threshold inceremnents, then 2 clear saccades separated by a hold.
            // Guarantees:
            // No NaN/Infinity in detection velocities
            // All kept saccades have finite numeric fields and non-negative durations
            // ISI series contains only finite, non-negative values
            // Ordering is non-decreasing by (startTime, endTime) for perSaccade output when series is enabled.
            const vectors: Vec3[] = [];
            // 1) Tiny drift
            const tinyStep = 0.01;                                                            // Very small step to create a long sequence of sub-threshold movements
            for (let i =0; i < 120; i++) vectors.push(rotateYDeg(i * tinyStep));              // 120 samples of tiny drift (1.2° total)
            // 2) Saccade 1: +6° using 0.6° steps
            const base1 = 120 * tinyStep;                                                     // Starting point for saccade 1
            for (let k =1; k <= 10; k++) vectors.push(rotateYDeg(base1 + k * 0.6));           // Saccade 1: 10 steps of 0.6° => 6.0°
            // 3) Hold
            const hold1 = base1 + 6.0;                                                        // Hold at the end of saccade 1
            for (let i = 0; i < 30; i++) vectors.push(rotateYDeg(hold1));                     // Hold for 30 samples (150ms)
            // 4) More tiny drift
            const driftBase = hold1;                                                          // Starting point for second drift
            for (let i = 1; i <= 80; i++) vectors.push(rotateYDeg(driftBase + 1 * tinyStep)); // 80 samples of tiny drift (0.8° total) during hold
            // 5) Saccade 2: + 6° using 0.6° steps
            const base2 = driftBase + 80 * tinyStep;                                          // Starting point for saccade 2
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(base2 + k * 0.6));          // Saccade 2: 10 steps of 0.6° => 6.0°
            // 6) Hold
            const hold2 = base2 + 6.0;                                                        // Hold at the end of saccade 2
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(hold2));                     // Hold for 20 samples (100ms)

            const result = analyzeSaccadesFromVectors(vectors, undefined, { series: { amplitudeDegOverTime: true } });

            // Detection velocities must be finite
            expect(result.detection.velocitiesDegPerSec.length).toBe(vectors.length);         // Velocity should be computed for each vector
            expect(result.detection.velocitiesDegPerSec.every(Number.isFinite)).toBe(true);   // All velocity values should be finite numbers
            // We should have atleast 2 detected saccades
            expect(result.detection.saccades.length).toBeGreaterThanOrEqual(2);               // Detect our two distinct saccades
            // No filtering (bounds not provided)
            expect(result.metrics.filtered.totalFiltered).toBe(0);                            // With no plausible bounds, we expect no filtering to occur
            // Per saccade derived fields must be finite and sane
            expect(result.metrics.perSaccade.length).toBe(result.detection.saccades.length);  // All detected saccades should be kept since no filtering occurs

            for (const s of result.metrics.perSaccade) {
                expect(Number.isFinite(s.startTime)).toBe(true);                              // startTime should be a finite number
                expect(Number.isFinite(s.endTime)).toBe(true);                                // endTime should be a finite number
                expect(Number.isFinite(s.durationMs)).toBe(true);                             // durationMs should be a finite number
                expect(Number.isFinite(s.durationSec)).toBe(true);                            // durationSec should be a finite number
                expect(Number.isFinite(s.amplitudeDeg)).toBe(true);                           // amplitudeDeg should be a finite number
                expect(Number.isFinite(s.ratePerSec)).toBe(true);                             // ratePerSec should be a finite number
                expect(s.durationMs).toBeGreaterThanOrEqual(0);                               // durationMs should be non-negative
                expect(s.durationSec).toBeGreaterThanOrEqual(0);                              // durationSec should be non-negative
            }
            // Ordering non-decreasing by (startTime, endTime)
            for (let i = 1; i < result.metrics.perSaccade.length; i++) {
                const prev = result.metrics.perSaccade[i - 1];                                // Previous saccade
                const cur = result.metrics.perSaccade[i];                                     // Current saccade
                const ok =                                                                    // If start times are equal, end time must be non-decreasing
                    cur.startTime > prev.startTime ||
                    (cur.startTime === prev.startTime && cur.endTime >= prev.endTime); 
                // Each saccade should start after the previous one, or if they start at the same time, the end time should be non-decreasing
                expect(ok).toBe(true);
            }
            // ISI sanity: finite and non-negative
            expect(result.metrics.isiSeries.every(isi => Number.isFinite(isi) && isi >= 0)).toBe(true);      // All ISI values should be finite and non-negative
            // Length contract
            expect(result.metrics.isiSeries.length).toBe(Math.max(0, result.metrics.perSaccade.length - 1)); // ISI series length should be one less than the number of kept saccades
        });
    });

    describe('C) Detection Option Propagation', () => {
        it('C1) Custom velocity threshold alters detection outcome', () => {
            // Dataset similar to A1
            // Run 1: default threshold (100) => should detect >= 1 saccade
            // Run 2: high threshold (1000) => should detect 0 saccades
            const vectors: Vec3[] = [];                                                               // Initialize empty dataset
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));                                 // Hold at 0°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));                          // Saccade: 10 steps of 0.6° => 6.0°, should yield ~120°/s velocity
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(6.0));                               // Hold at 6°
            // Run 1: default detection options
            const rDefault = analyzeSaccadesFromVectors(vectors);                                     //Default options should detect the saccade
            expect(rDefault.detection.saccades.length).toBeGreaterThanOrEqual(1);                     // We should detect at least 1 saccade with default options
            expect(rDefault.metrics.perSaccade.length).toBeGreaterThanOrEqual(1);                     // With default options, we should have at least 1 kept saccade
            // Run 2: absurdly high threshold -> no detection
            const rHigh = analyzeSaccadesFromVectors(vectors, { velocityThresholdDegPerSec: 1000 });  // With a very high velocity threshold, we should detect no saccades
            expect(rHigh.detection.saccades.length).toBe(0);                                          // We should detect 0 saccades with the high velocity threshold
            expect(rHigh.detection.saccadesExtended.length).toBe(0);                                  // Extended saccades should also be 0
            expect(rHigh.metrics.perSaccade.length).toBe(0);                                          // With no detected saccades, we should have 0 kept saccades
            // Session should be the empty-session contract
            expect(rHigh.metrics.session.durationMs).toBe(0);                                         // Session duration should be 0 for an empty session
            expect(rHigh.metrics.session.durationSec).toBe(0);                                        // Session duration should be 0 for an empty session
            expect(rHigh.metrics.session.ratePerSec).toBe(0);                                         // Saccade rate should be 0 for an empty session
        });

        it('C2) includeExtended flag propagates and only affects saccadesExtended', () => {
            // Default includeExtended = true (per schema)
            // We run the same vectors twice:
            // A: default (expect saccadesExtended present, same count as saccades)
            // B: includeExtended = false (expect saccadesExtended to be empty)
            // Metrics should be identical
            const vectors: Vec3[] = [];                                                     // Initialize empty dataset
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));                       // Hold at 0°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));                // Saccade: 10 steps of 0.6° => 6.0°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(6.0));                     // Hold at 6°
            // Run A: default (includeExtended = true)
            const a = analyzeSaccadesFromVectors(vectors);                                  // Run with default options (includeExtended should be true)
            expect(a.detection.saccades.length).toBeGreaterThanOrEqual(1);                  // We should detect at least 1 saccade
            expect(a.detection.saccadesExtended.length).toBe(a.detection.saccades.length);  // With includeExtended = true, saccadesExtended should have the same count as saccades
            // Spot check extended fields exist on the first extended event
            const ext0 = a.detection.saccadesExtended[0];                                   // First extended saccade
            expect(ext0.startVector).toBeDefined();                                         // startVector should be defined in extended saccades
            expect(ext0.endVector).toBeDefined();                                           // endVector should be defined in extended saccades
            expect(ext0.direction).toBeDefined();                                           // direction should be defined in extended saccades
            // Run B: includeExtended = false
            const b = analyzeSaccadesFromVectors(vectors, { includeExtended: false });      // Run with includeExtended = false
            expect(b.detection.saccades.length).toBeGreaterThanOrEqual(1);                  // We should still detect at least 1 saccade
            expect(b.detection.saccadesExtended.length).toBe(0);                            // With includeExtended = false, saccadesExtended should be empty
            // Metrics should be identical between A and B 
            expect(b.metrics).toEqual(a.metrics);
        });
    });

    describe('D) Metrics Option Propagation', () => {
        it('D1) Segment configuration propagates and asigns counts correctly', () => {
            // Build 2 saccades separated in time
            // A [0ms, 200ms)
            // B [200ms, 500ms)
            // Saccade 1 around 100ms
            // Saccade 2 around 300ms
            const vectors: Vec3[] = [];
            // Hold at 0°
            for (let i=0; i < 20; i++) vectors.push(rotateYDeg(0));             // 20 samples * 5ms = 100ms hold
            // Saccade 1
            for (let k=1; k <= 10;k++) vectors.push(rotateYDeg(k * 0.6));       // 10 steps of 0.6° => 6.0°, should yield ~120°/s velocity
            // Hold long enough to create a clear segment boundary
            for (let i=0; i < 40; i++) vectors.push(rotateYDeg(6.0));           // 40 samples * 5ms = 200ms hold, now at 300ms total
            // Saccade 2
            for (let k=1; k <= 10;k++) vectors.push(rotateYDeg(6.0 + k * 0.6)); // Another saccade of 6.0° starting at ~300ms
            // Hold at the end
            for (let i=0; i < 20; i++) vectors.push(rotateYDeg(12.0));          // Final hold

            const result = analyzeSaccadesFromVectors(                          // Run the pipeline with segment configuration
                vectors, undefined, 
                { segments: [
                    {id: 'A', startTime: 0, endTime: 200 },
                    {id: 'B', startTime: 200, endTime: 500 },
                    ],
                }
            );

            const segments = result.metrics.segmentSummaries;                   // Extract segment summaries for assertions
            expect(segments.length).toBe(2);                                    // We should have 2 segments in the summary
            
            const segA = segments.find(s => s.id === 'A');                      // Find segment A
            const segB = segments.find(s => s.id === 'B');                      // Find segment B
            expect(segA).toBeDefined();                                         // Segment A should be defined
            expect(segB).toBeDefined();                                         // Segment B should be defined
            expect(segA!.count).toBe(1);                                        // Segment A should contain the first saccade
            expect(segB!.count).toBe(1);                                        // Segment B should contain the second saccade
            expect(result.metrics.unassigned.count).toBe(0);                    // With our construction, we should have no unassigned saccades

            // Rate per sec = count / durationSec
            expect(segA!.ratePerSec).toBeCloseTo(                               // Rate for segment A should be count divided by duration in seconds
                segB!.count / segA!.durationSec,
                10
            );
        });

        it('D2) ISI plausible bounds propagate and filter out-of-bounds ISIs with transparency', () => {
            // Build two strong saccades separated by a long hold so ISI is large
            // dt = 5ms (200 Hz)
            // We then set isiPlausibleBounds to a small max to force:
            // - raw ISI exists
            // - filtered ISI series becomes empty
            // - isiFiltered.totalFiltered increments with reason "isi_out_of_bounds"
            const vectors: Vec3[] = [];  // Initialize empty dataset
            // Hold at 0°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));              // Hold for 100ms
            // Saccade 1: 0° -> 6°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));       // Saccade of ~6° should yield ~120°/s velocity
            // Hold for a long time to create a large ISI
            for (let i = 0; i < 80; i++) vectors.push(rotateYDeg(6.0));            // Hold for 400ms to create a large ISI (well above typical plausible bounds)
            // Saccade 2: 6° -> 12°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(6.0 + k * 0.6)); // Another saccade of 6.0° starting at ~500ms
            // Hold at 12°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(12.0));           // Final hold
            // Baseline run with NO ISI bounds: should keep the ISI (non-negative, finite)
            const baseline = analyzeSaccadesFromVectors(
                vectors,
                undefined,
                { series: { amplitudeDegOverTime: true } }                         // Enable series to ensure perSaccade is in chronological order
            );
            // We need at least 2 kept saccades to have an ISI
            const strongBase = baseline.metrics.perSaccade.filter(s => s.amplitudeDeg >= 5.0);            // Filter for strong saccades to identify our two main events
            expect(strongBase.length).toBeGreaterThanOrEqual(2);                                          // We should have at least 2 strong saccades to analyze the ISI between them
            // Baseline ISI series should contain at least one value
            expect(baseline.metrics.isiSeries.length).toBeGreaterThanOrEqual(1);                          // With at least 2 kept saccades, we should have at least 1 ISI value in the baseline
            expect(baseline.metrics.isiSeries.every(isi => Number.isFinite(isi) && isi >= 0)).toBe(true); // All ISI values in the baseline should be finite and non-negative
            // Now enforce a max ISI that is way too small (50ms)
            const bounded = analyzeSaccadesFromVectors(
                vectors,
                undefined,
                {
                    series: { amplitudeDegOverTime: true },   // Enable series to ensure perSaccade is in chronological order
                    isiPlausibleBounds: {
                        isiMs: { min: 0, max: 50 },           // Set max ISI to 50ms, which is much smaller than our expected ISI of ~400ms
                    },
                }
            );
            // With a large gap, ISI should be filtered out
            expect(bounded.metrics.isiSeries.length).toBe(0);                                          // With the max ISI set to 50ms, our expected ISI of ~400ms should be filtered out
            // Transparency: totalFiltered should be >= 1 and reason should include "isi_out_of_bounds"
            expect(bounded.metrics.isiFiltered.totalFiltered).toBeGreaterThanOrEqual(1);               // We should have filtered at least 1 ISI due to it being out of bounds
            expect(bounded.metrics.isiFiltered.byReason.isi_out_of_bounds).toBeGreaterThanOrEqual(1);  // The reason for filtering should include "isi_out_of_bounds"
            // Also ensure no negative/overlap reason is present for this constructed case
            // We built increasing time, so ISI should be non-negative
            expect(bounded.metrics.isiFiltered.byReason.isi_negative_or_overlap ?? 0).toBe(0);         // We should have no negative or overlap ISIs in this construction
        });

        it('D3) Series flags propagate and series points match per-saccade values', () => {
            // Two strong saccades for multiple points
            // Then enable both series:
            // - saccadeRatePerSecOverTime
            // - amplitudeDegOverTime

            // Assertions:
            // - Series arrays are present and have correct lengths
            // - x values match perSaccade.startTime
            // - y values match perSaccade.ratePerSec / amplitudeDeg
            // - series are in chronological order (non-decreasing by x, tie-breaking by y)
            const vectors: Vec3[] = [];

            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));               // Hold at 0°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));        // Saccade 1: 0 -> 6°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(6.0));             // Hold
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(6.0 + k * 0.6));  // Saccade 2: 6 -> 12°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(12.0));            // Hold

            const result = analyzeSaccadesFromVectors(
                vectors,
                undefined,
                {
                // No plausibleBounds so we keep all detected events
                series: {
                    saccadeRatePerSecOverTime: true,
                    amplitudeDegOverTime: true,
                },
                }
            );
            // With series enabled, metrics.perSaccade returns keptOrdered per our implementation.
            const per = result.metrics.perSaccade;
            expect(per.length).toBeGreaterThanOrEqual(2);                             // Sanity: expect at least 2 (may be more if detector produces extra intervals)
            const rateSeries = result.metrics.series.saccadeRatePerSecOverTime;       // Extract the saccade rate series for assertions
            const ampSeries = result.metrics.series.amplitudeDegOverTime;             // Extract the amplitude series for assertions
            // Series lengths must match keptOrdered length (perSaccadeOut)
            expect(rateSeries.length).toBe(per.length);                               // The saccade rate series should have the same number of points as the perSaccade array 
            expect(ampSeries.length).toBe(per.length);                                // The amplitude series should also have the same number of points as the perSaccade array 
            for (let i = 0; i < per.length; i++) {
                expect(rateSeries[i].x).toBe(per[i].startTime);                       // The x value of the rate series point should match the startTime of the corresponding perSaccade record
                expect(rateSeries[i].y).toBeCloseTo(per[i].ratePerSec, 12);           // The y value of the rate series point should match the ratePerSec of the corresponding perSaccade record

                expect(ampSeries[i].x).toBe(per[i].startTime);                        // The x value of the amplitude series point should match the startTime of the corresponding perSaccade record
                expect(ampSeries[i].y).toBeCloseTo(per[i].amplitudeDeg, 12);          // The y value of the amplitude series point should match the amplitudeDeg of the corresponding perSaccade record
            }
            // Chronological monotonicity for series x-values
            for (let i = 1; i < rateSeries.length; i++) {
                expect(rateSeries[i].x).toBeGreaterThanOrEqual(rateSeries[i - 1].x);  // The x values of the rate series should be in non-decreasing order to ensure chronological ordering
            }
            for (let i = 1; i < ampSeries.length; i++) {
                expect(ampSeries[i].x).toBeGreaterThanOrEqual(ampSeries[i - 1].x);    // The x values of the amplitude series should also be in non-decreasing order to ensure chronological ordering
            }
        });

        it('D4) CSV flags propagate and rows reflect session & segment summaries', () => {
            // Two saccades in two segments
            // Enable:
            // - csv.sessionSummaryRow
            // - csv.segmentSummaryRows
            // Assertions:
            // - sessionSummaryRow exists and matches metrics.session
            // - segmentSummaryRows length matches segment count
            // - Counts and rates are correct
            const vectors: Vec3[] = [];
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));                               // Hold at 0°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));                        // Saccade 1: 0 -> 6°
            for (let i = 0; i < 40; i++) vectors.push(rotateYDeg(6.0));                             // Hold
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(6.0 + k * 0.6));                  // Saccade 2: 6 -> 12°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(12.0));                            // Hold

            const result = analyzeSaccadesFromVectors(                                              // Run the pipeline with CSV configuration
                vectors,
                undefined,
                {
                includeRatePerMin: true,
                segments: [
                    { id: 'A', startTime: 0, endTime: 200 },                                        // Segment A: should contain Saccade 1
                    { id: 'B', startTime: 200, endTime: 500 },                                      // Segment B: should contain Saccade 2
                ],
                csv: {
                    sessionSummaryRow: true,
                    segmentSummaryRows: true,
                },
                }
            );

            // ---- Session CSV ----
            const sessionRow = result.metrics.csv.sessionSummaryRow;                                // Extract the session summary row for assertions
            expect(sessionRow).not.toBeNull();                                                      // We should have a session summary row 
            expect(sessionRow!.keptCount).toBe(result.metrics.perSaccade.length);                   // The kept count should match the number of per-saccade metrics
            expect(sessionRow!.filteredCount).toBe(result.metrics.filtered.totalFiltered);          // The filtered count should match the total filtered metrics
            expect(sessionRow!.durationMs).toBe(result.metrics.session.durationMs);                 // The duration in ms should match the session duration
            expect(sessionRow!.durationSec).toBe(result.metrics.session.durationSec);               // The duration in seconds should match the session duration
            expect(sessionRow!.ratePerSec).toBe(result.metrics.session.ratePerSec);                 // The rate per second should match the session rate
            expect(sessionRow!.ratePerMin).toBeCloseTo(                                             // The rate per minute should be approx the session rate per second * 60
                result.metrics.session.ratePerSec * 60,
                10
            );

            // ---- Segment CSV ----
            const segmentRows = result.metrics.csv.segmentSummaryRows;                              // Extract the segment summary rows for assertions
            expect(segmentRows.length).toBe(2);                                                     // We should have 2 segment summary rows since we defined 2 segments in the config

            // For each segment row, find the corresponding segment summary and validate counts and rates
            for (const row of segmentRows) {
                const summary = result.metrics.segmentSummaries.find(s => s.id === row.segmentId);  // Find the corresponding segment summary for this row
                expect(summary).toBeDefined();                                                      // We should find a matching segment summary for this row

                expect(row.keptCount).toBe(summary!.count);                                         // The kept count in the row should match the count in the segment summary
                expect(row.durationMs).toBe(summary!.durationMs);                                   // The duration in ms should match the segment duration
                expect(row.durationSec).toBe(summary!.durationSec);                                 // The duration in seconds should match the segment duration
                expect(row.ratePerSec).toBe(summary!.ratePerSec);                                   // The rate per second should match the segment rate
                expect(row.ratePerMin).toBeCloseTo(summary!.ratePerSec * 60, 10);                   // The rate per minute should be approx the segment rate per second * 60
            }
        });
    });

    describe('E) Ordering & Stability Guarantees', () => {
    it('E1) Enforces stable chronological ordering across perSaccade, rows, and series', () => {
    
        // Create 3 saccades spaced in time.
        // We only care about final ordering guarantees.
        const vectors: Vec3[] = [];                                                 // Initialize empty dataset

        
        for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));                   // Initial hold at 0°
        for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));            // Saccade 1: 0 -> 6°
        for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(6.0));                 // Hold at 6°
        for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(6.0 + k * 0.6));      // Saccade 2: 6 -> 12°
        for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(12.0));                // Hold at 12°
        for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(12.0 + k * 0.6));     // Saccade 3: 12 -> 18°

        const result = analyzeSaccadesFromVectors(                                  // Run the pipeline with series enabled to get perSaccade in chronological order
        vectors,
        undefined,
        {
            series: {
            amplitudeDegOverTime: true,
            saccadeRatePerSecOverTime: true,
            },
        }
        );

        const per = result.metrics.perSaccade;                                      // Extract the per-saccade metrics for assertions
        const rows = result.metrics.perSaccadeRows;                                 // Extract the per-saccade CSV rows for assertions
        const rateSeries = result.metrics.series.saccadeRatePerSecOverTime;         // Extract the saccade rate series for assertions
        const ampSeries = result.metrics.series.amplitudeDegOverTime;               // Extract the amplitude series for assertions

        for (let i = 1; i < per.length; i++) {                                      // 1) perSaccade monotonic startTime
            const prev = per[i - 1];                                                // Previous saccade
            const cur = per[i];                                                     // Current saccade
            const ok =  
                cur.startTime > prev.startTime ||                                   // Each saccade should start after the previous one, 
                (cur.startTime === prev.startTime && cur.endTime >= prev.endTime);  // or if they start at the same time, the end time should be non-decreasing

            expect(ok).toBe(true);                                                  // Assert that the ordering is correct
        }

        for (let i = 0; i < rows.length; i++) {                                     // 2) Rows follow same order
            expect(rows[i].startTime).toBe(per[i].startTime);                       // Each row should correspond to the same saccade as in perSaccade
        }

        for (let i = 0; i < per.length; i++) {                                      // 3) Series follow same order
            expect(rateSeries[i].x).toBe(per[i].startTime);                         // The x value of the rate series point should match the startTime of the corresponding perSaccade record  
            expect(ampSeries[i].x).toBe(per[i].startTime);                          // The x value of the amplitude series point should match the startTime of the corresponding perSaccade record
        }

        if (per.length >= 2) {                                                      // 4) ISI is computed from chronological order
        for (let i = 0; i < result.metrics.isiSeries.length; i++) { 
            const expectedIsi = per[i + 1].startTime - per[i].endTime;              // Expected ISI should be the difference between the start of next saccade and end of the current saccade
            expect(result.metrics.isiSeries[i]).toBeCloseTo(expectedIsi, 10);       // Assert that the ISI value matches the expected value based on the perSaccade ordering
        }
        }
    });

    it('E2) Maintains stable ordering under near-ties at dt resolution across perSaccade, rows, and series', () => {
        // Build two strong saccades separated by the smallest possible clean gap (1 sample tick).
        // dt = 5ms.

        // We don't need exact tie startTimes; we need to ensure no ordering instability
        // when events are extremely close in time.
    
        const vectors: Vec3[] = [];                                                             // Initialize empty dataset
        for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));                               // Hold
        for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));                        // Saccade 1: 0 -> 6°
        vectors.push(rotateYDeg(6.0));                                                          // Minimal gap: 1 sample hold (5ms)
        for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(6.0 + k * 0.6));                  // Saccade 2: 6 -> 12°
        for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(12.0));                            // Hold
        const r1 = analyzeSaccadesFromVectors(                                                  // Run twice to catch any unstable ordering
            vectors,
            undefined,
            {
                series: {
                amplitudeDegOverTime: true,
                saccadeRatePerSecOverTime: true,
                },
            }
        );
        const r2 = analyzeSaccadesFromVectors(                                                  // Run twice to catch any unstable ordering
            vectors,
            undefined,
            {
                series: {
                amplitudeDegOverTime: true,
                saccadeRatePerSecOverTime: true,
                },
            }
        );
        // Sanity: we expect >= 2 kept events (might include artifacts if bounds are enabled elsewhere)
        expect(r1.metrics.perSaccade.length).toBeGreaterThanOrEqual(2);                         // We should detect at least 2 saccades in the first run
        expect(r2.metrics.perSaccade.length).toBeGreaterThanOrEqual(2);                         // We should also detect at least 2 saccades in the second run
        // Ordering invariants in each run
        assertStableOrder(r1);                                                                  // Check that the order of saccades is stable in the first run
        assertStableOrder(r2);                                                                  // Check that the order of saccades is stable in the second run
        // Stability across runs: ordering should not change
        // Compare the sequence of (startTime,endTime,amplitudeDeg) tuples.
        const sig1 = r1.metrics.perSaccade.map(s => [s.startTime, s.endTime, s.amplitudeDeg]);  // Extract the signature of saccades from the first run for comparison
        const sig2 = r2.metrics.perSaccade.map(s => [s.startTime, s.endTime, s.amplitudeDeg]);  // Extract the signature of saccades from the second run for comparison

        expect(sig2).toEqual(sig1);                                                             // The sequence of saccades should be identical across runs
    });
    });

    describe('F) Configuration Stability & Backward Compatibility', () => {
        it('F1) Explicit empty options are equivalent to implicit defaults', () => {
            // Contract:
            // analyzeSaccadesFromVectors(vectors) === analyzeSaccadesFromVectors(vectors, {}, {})

            // This protects backward compatibility and ensures the wrapper doesn't treat
            // "undefined" differently than "empty object" in a way that changes outputs.
            const vectors: Vec3[] = [];                                                    // Initialize empty dataset
            // Use a dataset that yields multiple events to make equality meaningful.
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(0));                      // Hold at 0°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(k * 0.6));               // Saccade: 10 steps of 0.6° => 6.0°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(6.0));                    // Hold at 6°
            for (let k = 1; k <= 10; k++) vectors.push(rotateYDeg(6.0 + k * 0.6));         // Saccade: 10 steps of 0.6° => 6.0°, now at 12°
            for (let i = 0; i < 20; i++) vectors.push(rotateYDeg(12.0));                   // Hold at 12°
            const implicit = analyzeSaccadesFromVectors(vectors);                          // Run with implicit defaults
            const explicit = analyzeSaccadesFromVectors(vectors, {}, {});                  // Run with explicit empty options
            expect(explicit).toEqual(implicit);                                            // The full result objects should be deeply equal
        });
    });
});