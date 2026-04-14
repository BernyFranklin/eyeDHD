import { describe, it, expect } from 'vitest';
import { detectSaccadesFromVectors } from '../core/detection';
import type { Vec3 } from '../core/velocities';

// Passed to testing functions
const defaultThresholds = {
    velocityThresholdDegPerSec: 40,
    minDurationMs: 10,
    includeExtended: true,
};

function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

// Unit vector rotated by 'deg' degrees in the XY plane
function makeUnitVecXY(deg: number): Vec3 {
    const r = degToRad(deg);
    return {
        x: Math.cos(r),
        y: Math.sin(r),
        z: 0,
    };
}

describe('Saccade Detection', () => {
    it("1) Returns arrays with expected lengths (smoke test)", () => {
        const vectors: Vec3[] = [
            makeUnitVecXY(0),
            makeUnitVecXY(0),
            makeUnitVecXY(1),
            makeUnitVecXY(2),
        ];
         const result = detectSaccadesFromVectors(vectors, defaultThresholds);

         expect(result.velocitiesDegPerSec.length).toBe(vectors.length);
         expect(Array.isArray(result.saccades)).toBe(true);
         expect(Array.isArray(result.saccadesExtended)).toBe(true);
    });

    it("2) No saccades when velocities stay below the threshold", () => {
        // 0.1 deg per frame @ 200Hz => 20 deg/sec < 40 deg threshold
        const vectors: Vec3[] = [
            makeUnitVecXY(0.0),
            makeUnitVecXY(0.1),
            makeUnitVecXY(0.2),
            makeUnitVecXY(0.3),
            makeUnitVecXY(0.4),
        ];

        const result = detectSaccadesFromVectors(vectors, defaultThresholds);
        expect(result.saccades.length).toBe(0);
        expect(result.saccadesExtended.length).toBe(0);
    });

    it("3) Detects a single saccade burst above threshold and compute metrics", () => {
        // index: 0, 1, 2, 3, 4, 5, 6
        // deg  : 0, 0, 0, 1, 2, 3, 3 
        // velocities at i = 3, 4 ,5 are 200 deg/sec (1 degree step)
        const vectors: Vec3[] = [
            makeUnitVecXY(0),
            makeUnitVecXY(0),
            makeUnitVecXY(0),
            makeUnitVecXY(1),
            makeUnitVecXY(2),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
        ];

        const result = detectSaccadesFromVectors(vectors, defaultThresholds);

        // One saccade expected from index 3 to 5
        expect(result.saccades.length).toBe(1);
        // grab the saccade for further checks
        const saccade = result.saccades[0];
        // Check saccade metrics
        expect(saccade.startIndex).toBe(3);
        expect(saccade.endIndex).toBe(5);
        // Duration = (end - start) * dt, dt = 1/200 = 0.005 sec
        // (5-3) * 0.005 = 0.01s => 10ms
        expect(saccade.durationMs).toBeCloseTo(10, 6);
        // Amplitudes
        expect(saccade.peakVelocityDegPerSec).toBeCloseTo(200, 3);
        expect(saccade.meanVelocityDegPerSec).toBeCloseTo(200, 3);
        expect(saccade.amplitudeDeg).toBeCloseTo(3, 3); 
        // Optional extended data checks
        expect(result.saccadesExtended.length).toBe(1);
        expect(result.saccadesExtended[0].startVector).toBeTruthy();
        expect(result.saccadesExtended[0].endVector).toBeTruthy();

    });

    it("4) Rejects events shorter than minDurationMs", () => {
        // Only one above-threshold sample
        const vectors: Vec3[] = [
            makeUnitVecXY(0),
            makeUnitVecXY(0),
            makeUnitVecXY(1), 
            makeUnitVecXY(1),
        ];

        const result = detectSaccadesFromVectors(vectors, defaultThresholds);
        expect(result.saccades.length).toBe(0);
        expect(result.saccadesExtended.length).toBe(0);
    });

    it("5) Splits into two saccades when separated by a below-threshold gap", () => {
        // Gap must exceed minInterSaccadeMs (default 30ms = 6 samples at 200 Hz)
        const vectors: Vec3[] = [
            makeUnitVecXY(0),
            makeUnitVecXY(0),
            // Burst 1
            makeUnitVecXY(1),
            makeUnitVecXY(2),
            makeUnitVecXY(3),
            // Gap — 11 stationary samples (55ms at 200 Hz, exceeds 50ms refractory)
            makeUnitVecXY(3),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
            // Burst 2
            makeUnitVecXY(4),
            makeUnitVecXY(5),
            makeUnitVecXY(6),
            makeUnitVecXY(6),
        ];

        const result = detectSaccadesFromVectors(vectors, defaultThresholds);

        expect(result.saccades.length).toBe(2);
        expect(result.saccadesExtended.length).toBe(2);
    });

    it("6) includeExtended: false returns no extended data", () => {
        const vectors: Vec3[] = [
            makeUnitVecXY(0),
            makeUnitVecXY(0),
            makeUnitVecXY(1),
            makeUnitVecXY(2),
            makeUnitVecXY(3),
            makeUnitVecXY(3),
        ];

        const result = detectSaccadesFromVectors(vectors, {
            ...defaultThresholds,
            includeExtended: false,
        });

        expect(result.saccades.length).toBe(1);
        expect(result.saccadesExtended.length).toBe(0);
    });

});