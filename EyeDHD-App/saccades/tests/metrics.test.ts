import { describe, it, expect } from 'vitest';
import {computeSaccadeMetrics } from '../metrics'
import { max, or } from 'three/tsl';

describe('Saccade Metrics', () => {
    // Derived fields
    describe('A) Derived Fields', () => {
        it('A1) Computes derived per-saccade fields', () => {
            const input = [
                {
                    startTime: 1000,    // ms
                    endTime: 1050,      // ms
                    amplitudeDeg: 5        // degrees
                }
            ];
    
            const result = computeSaccadeMetrics(input);
            expect(result.perSaccade.length).toBe(1);
    
            const saccade = result.perSaccade[0];
            expect(saccade.durationMs).toBe(50);
            expect(saccade.durationSec).toBeCloseTo(0.05, 6);
            expect(saccade.ratePerSec).toBeCloseTo(100, 6);
        });
    
        it('A2) Computes derived fields for multiple saccades and preserves order', () => {
            const input = [
                { startTime: 2000, endTime: 2100, amplitudeDeg: 2  },   // 100ms, 0.1s, 20deg/s
                { startTime: 500,  endTime: 520,  amplitudeDeg: 1  },   // 20ms, 0.02s, 50deg/s
                { startTime: 9000, endTime: 9050, amplitudeDeg: 10 }    // 50ms, 0.05s, 200deg/s
            ];
    
            const result = computeSaccadeMetrics(input);
            expect(result.perSaccade.length).toBe(3);
    
            // Order preserved: index 0 corresponds to the first input saccade, etc.
            expect(result.perSaccade[0].durationMs).toBe(100);
            expect(result.perSaccade[0].durationSec).toBeCloseTo(0.1, 6);
            expect(result.perSaccade[0].ratePerSec).toBeCloseTo(20, 6);
    
            expect(result.perSaccade[1].durationMs).toBe(20);
            expect(result.perSaccade[1].durationSec).toBeCloseTo(0.02, 6);
            expect(result.perSaccade[1].ratePerSec).toBeCloseTo(50, 6);
    
            expect(result.perSaccade[2].durationMs).toBe(50);
            expect(result.perSaccade[2].durationSec).toBeCloseTo(0.05, 6);
            expect(result.perSaccade[2].ratePerSec).toBeCloseTo(200, 6);
        });
        
        it('A3) Handles zero or negative durations without Infinity/NaN', () => {
            const input = [
                { startTime: 1000, endTime: 1000, amplitudeDeg: 5 },   // zero duration
                { startTime: 2000, endTime: 1990, amplitudeDeg: 5 }    // negative duration
            ];

            const result = computeSaccadeMetrics(input);

            expect(result.perSaccade.length).toBe(2);
            
            const zeroResult = result.perSaccade[0];
            
            expect(zeroResult.durationMs).toBe(0);
            expect(zeroResult.durationSec).toBeCloseTo(0, 6);
            expect(Number.isFinite(zeroResult.ratePerSec)).toBe(true);
            expect(Number.isNaN(zeroResult.ratePerSec)).toBe(false);

            const negativeResult = result.perSaccade[1];
            expect(negativeResult.durationMs).toBe(-10);
            expect(negativeResult.durationSec).toBeCloseTo(-0.01, 6);
            expect(Number.isFinite(negativeResult.ratePerSec)).toBe(true);
            expect(Number.isNaN(negativeResult.ratePerSec)).toBe(false);
            expect(negativeResult.ratePerSec).toBe(0);
        });

    });

    describe('B) Filtering and Transparency', () => {
        it('B1) Filters events outside plausible bounds and reports counts by reason', () => {
            const input = [
                { startTime: 1000, endTime: 1050, amplitudeDeg: 5   },    // Keep: Plausible
                { startTime: 2000, endTime: 2500, amplitudeDeg: 500 },    // Filter: amplitude too large
                { startTime: 3000, endTime: 5000, amplitudeDeg: 5   }     // Filter: duration too long
            ];

            // Applying filter with plausible bounds for amplitude and duration
            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 0, max: 250 }    
                },
            });

            // Only the first saccade should be kept
            expect(result.perSaccade.length).toBe(1);
            // Transparency Contract
            expect(result.filtered.totalFiltered).toBe(2);
            expect(result.filtered.byReason).toEqual({
                amplitude_out_of_bounds: 1,
                duration_out_of_bounds: 1,
            });
    });
    
        it('B2) Counts all applicable filter reasons while totalFiltered counts unique events', () => {
            const input = [
                { startTime: 1000, endTime: 2000, amplitudeDeg: 999 },  // Violates amplitude and duration bounds
                { startTime: 3000, endTime: 3050, amplitudeDeg: 999 },  // Violates amplitude bound only
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 }    
                },
            });

            // Event removed
            expect(result.perSaccade.length).toBe(0);
            // Unique filtered events
            expect(result.filtered.totalFiltered).toBe(2);
            // But multiple reasons apply to a single event
            expect(result.filtered.byReason).toEqual({
                amplitude_out_of_bounds: 2,
                duration_out_of_bounds: 1,
            });
        });
    
        it('B3) Filtering does not mutate inputs', () => {
            const input = [
                { startTime: 1000, endTime: 1050, amplitudeDeg:5    },     // Keep
                { startTime: 2000, endTime: 2050, amplitudeDeg: 999 },     // Filter: amplitude too large
            ];

            // Capture original references and values
            const originalArrayRef = input;
            const originalObj0Ref = input[0];
            const originalObj1Ref = input[1];
            const orignalJson = JSON.stringify(input);

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 }    
                },
            });

            // Input array and objects unchanged
            expect(input).toBe(originalArrayRef);
            expect(input[0]).toBe(originalObj0Ref);
            expect(input[1]).toBe(originalObj1Ref);
            expect(JSON.stringify(input)).toBe(orignalJson);

            // Returned kept saccade should not be the same object reference as the input item
            expect(result.perSaccade[0].length).toBe(1);
            expect(result.perSaccade[0]).not.toBe(originalObj0Ref);
        });

    });

    describe('C) Session Rate Metrics', () => {
        it('C1) Computes session ratePerSec from kept saccades over session duration', () => {
            const input = [
                { startTime: 1000, endTime: 1050, amplitudeDeg: 5   },   // Keep
                { startTime: 2000, endTime: 2050, amplitudeDeg: 5   },   // Keep
                { startTime: 3000, endTime: 3050, amplitudeDeg: 999 },   // Filter: amplitude too large
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 }
                },
            });

            // Sanity check: filtering applied
            expect(result.perSaccade.length).toBe(2);
            // Session span: min start = 1000, max end = 2050 => 1050ms = 1.05s
            expect(result.session.durationMs).toBe(1050);
            expect(result.session.durationSec).toBeCloseTo(1.05, 6);

            // ratePerSec: 2 saccades / 1.05s
            expect(result.session.ratePerSec).toBeCloseTo(2 / 1.05, 6);
        });
    
        it('C2)', () => {});
    
        it('C3)', () => {});
    
    });

    describe('D) Segment-level Metrics', () => {
        it('D1)', () => {});
    
        it('D2)', () => {});
    
        it('D3)', () => {});
    
        it('D4)', () => {});

    });

    describe('E) Distribution Stats', () => {
        it('E1)', () => {});
    
        it('E2)', () => {});
    
        it('E3)', () => {});

    });

    describe('F) ISI (inter-saccadic interval) + comparisons', () => {
        it('F1)', () => {});
    
        it('F2)', () => {});
    
        it('F3)', () => {});
    
        it('F4)', () => {});
    
        it('F5)', () => {});

    });

    describe('G) Plot/CSV-ready Outputs', () => {
        it('G1)', () => {});
    
        it('G2)', () => {});
    
        it('G3)', () => {});

    });

    describe('H) Ordering guarantees', () => {
        it('H1)', () => {});
        
    });
});