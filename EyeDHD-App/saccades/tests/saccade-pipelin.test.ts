import { describe, it, expect } from 'vitest';
import { analyzeSaccadesFromVectors } from '../index';
import type { Vec3 } from '../index';

function rotateYDeg(angleDeg: number): Vec3 {
    const rad = (angleDeg * Math.PI) / 180;
    return {
        x: Math.sin(rad),
        y: 0,
        z: Math.cos(rad),
    };
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
});