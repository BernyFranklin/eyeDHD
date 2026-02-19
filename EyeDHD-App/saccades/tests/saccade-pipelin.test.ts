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
    });
});