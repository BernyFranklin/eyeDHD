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
    
        it('C2) Computes session ratePerMin when includeRatePerMin is true', () => {
            const input = [
                { startTime: 1000, endTime: 1050, amplitudeDeg: 5 },   // Keep
                { startTime: 2000, endTime: 2050, amplitudeDeg: 5 },   // Keep
            ];

            const result = computeSaccadeMetrics(input, {
                includeRatePerMin: true,
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs: { min: 1, max: 250 },
                },
            });

            // Session span: min start = 1000,, max end = 2050 => 1050ms => 1.05s
            const expectedRatePerSec = 2 / 1.05;
            const expectedRatePerMin = expectedRatePerSec * 60;
            expect(result.session.ratePerSec).toBeCloseTo(expectedRatePerSec, 6);
            expect(result.session.ratePerMin).toBeCloseTo(expectedRatePerMin, 6);
        });
    
        it('C3) Omits session ratePerMin when includeRatePerMin is not enabled', () => {
            const input = [
                { startTime: 1000, endTime: 1050, amplitudeDeg: 5 },   
                { startTime: 2000, endTime: 2050, amplitudeDeg: 5 },
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs: { min: 1, max: 250 },
                },
            });

            expect(result.session.ratePerSec).toBeTypeOf('number');
            expect(result.session.ratePerMin).toBeUndefined();
        });
    
    });

    describe('D) Segment-level Metrics', () => {
        it('D1) Assigns saccades to segments and computes segment ratePerSec', () => {
            const input = [
                // Segment 1: [0, 2000)
                { startTime: 500,  endTime: 550,  amplitudeDeg: 5 },    // Seg 1
                { startTime: 1500, endTime: 1550, amplitudeDeg: 5 },    // Seg 1

                // Segment 2: [2000, 400)
                { startTime: 2500, endTime: 2550, amplitudeDeg: 5 },    // Seg 2]
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs: { min: 1, max: 250 },
                },
                segments: [
                    { id: 'seg1', startTime: 0,    endTime: 2000 },
                    { id: 'seg2', startTime: 2000, endTime: 4000 },
                ],
            });

            // All are plausible, so all should remain
            expect(result.perSaccade.length).toBe(3);

            expect(result.segmentSummaries.length).toBe(2);

            const s1 = result.segmentSummaries.find((s: any) => s.id === 'seg1');
            const s2 = result.segmentSummaries.find((s: any) => s.id === 'seg2');

            // Segment durations: 2000ms each => 2s
            expect(s1.durationMs).toBe(2000);
            expect(s2.durationMs).toBe(2000);

            // Counts
            expect(s1.count).toBe(2);
            expect(s2.count).toBe(1);

            // Rates: count / 2s
            expect(s1.ratePerSec).toBeCloseTo(1, 6);    // 2 / 2
            expect(s2.ratePerSec).toBeCloseTo(0.5, 6);  // 1 / 2
        });
    
        it('D2) Assigns by startTime with [start, end) boundaries and tracks unassigned', () => {
            const input = [
                // Boundary case: exactly at seg1 end -> should fall into seg2
                { startTime: 2000, endTime: 2050, amplitudeDeg: 5 },    // Seg 2
                // Outside all segments -> unassigned
                { startTime: 4500, endTime: 4550, amplitudeDeg: 5 },    // Unassigned
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs: { min: 1, max: 250 },
                },
                segments: [
                    { id: 'seg1', startTime: 0,    endTime: 2000 },
                    { id: 'seg2', startTime: 2000, endTime: 4000 },
                ],
            });
            // Both are plausible, so both should remain in perSaccade
            expect(result.perSaccade.length).toBe(2);

            const seg1 = result.segmentSummaries.find((s: any) => s.id === 'seg1');
            const seg2 = result.segmentSummaries.find((s: any) => s.id === 'seg2');

            expect(seg1.count).toBe(0);
            expect(seg2.count).toBe(1);

            expect(seg2.ratePerSec).toBeCloseTo(0.5, 6);  // 1 saccade in 2s segment

            expect(result.unassigned.count).toBe(1);      // Unassigned tracking
        });
    
        it('D3) Computes segment ratePerMin when includeRatePerMin is true', () => {
            const input = [
                // Segment 1: [0, 2000) => 2 seconds
                { startTime: 100,  endTime: 150,  amplitudeDeg: 5 },
                { startTime: 1100, endTime: 1150, amplitudeDeg: 5 },
                // Segment 2: [2000, 4000) => 2 seconds
                { startTime: 2100, endTime: 2150, amplitudeDeg: 5 },
            ];

            const result = computeSaccadeMetrics(input, {
                includeRatePerMin: true,
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs: { min: 1, max: 250 },
                },
                segments: [
                    { id: 'seg1', startTime: 0,    endTime: 2000 },
                    { id: 'seg2', startTime: 2000, endTime: 4000 },
                ],
            });

            const seg1 = result.segmentSummaries.find((s: any) => s.id === 'seg1');
            const seg2 = result.segmentSummaries.find((s: any) => s.id === 'seg2');

            // Segment 1: 2 events / 2s = 1/sec => 60/min
            expect(seg1.ratePerSec).toBeCloseTo(1, 6);
            expect(seg1.ratePerMin).toBeCloseTo(60, 6);
            // Segment2: 1 event / 2s = 0.5/sec => 30/min
            expect(seg2.ratePerSec).toBeCloseTo(0.5, 6);
            expect(seg2.ratePerMin).toBeCloseTo(30, 6);
        });
    
        it('D4) Omits segment ratePerMin when includeRatePerMin is not enabled', () => {
            const input = [
                { startTime: 100,  endTime: 150,  amplitudeDeg: 5 },  // seg1
                { startTime: 2100, endTime: 2150, amplitudeDeg: 5 },  // seg2
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs: { min: 1, max: 250 },
                },
                segments: [
                    { id: 'seg1', startTime: 0,    endTime: 2000 },
                    { id: 'seg2', startTime: 2000, endTime: 4000 },
                ],
            });

            const seg1 = result.segmentSummaries.find((s: any) => s.id === 'seg1');
            const seg2 = result.segmentSummaries.find((s: any) => s.id === 'seg2');

            expect(seg1.ratePerMin).toBeUndefined();
            expect(seg2.ratePerMin).toBeUndefined();
        });

    });

    describe('E) Distribution Stats', () => {
        it('E1) Computes amplitude distribution stats (mean/median/p10/p50/p90/min/max/std)', () => {
            const input = [
                { startTime: 0, endTime: 50, amplitudeDeg: 10 },        // min
                { startTime: 100, endTime: 150, amplitudeDeg: 20 },
                { startTime: 200, endTime: 250, amplitudeDeg: 30 },
                { startTime: 300, endTime: 350, amplitudeDeg: 40 },
                { startTime: 400, endTime: 450, amplitudeDeg: 50 },     // max
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs: { min: 1, max: 250 },
                },
            });

            const stats = result.session.distributions.amplitudeDeg;

            expect(stats.min).toBe(10);
            expect(stats.max).toBe(50);
            expect(stats.mean).toBeCloseTo(30, 6);
            expect(stats.median).toBeCloseTo(30, 6);

            expect(stats.p10).toBeCloseTo(10, 6);
            expect(stats.p50).toBeCloseTo(30, 6);
            expect(stats.p90).toBeCloseTo(50, 6);

            // Lock in exact std definition in E2
            expect(Number.isFinite(stats.std)).toBe(true);
            expect(stats.std).toBeGreaterThan(0);
        });
    
        it('E2) Uses deterministic percentile coalculation and population standard deviation', () => {
                const input = [
                    { startTime: 0,   endTime: 50,  amplitudeDeg: 10 },
                    { startTime: 100, endTime: 150, amplitudeDeg: 20 },
                    { startTime: 200, endTime: 250, amplitudeDeg: 40 },
                    { startTime: 300, endTime: 350, amplitudeDeg: 80 },
                ];

                const result = computeSaccadeMetrics(input, {
                    plausibleBounds: {
                        amplitudeDeg: { min: 0, max: 100 },
                        durationMs: { min: 1, max: 250 },
                    },
                });

                const stats = result.session.distributions.amplitudeDeg;

                // Basic distribution checks
                expect(stats.min).toBe(10);
                expect(stats.max).toBe(80);
                expect(stats.mean).toBeCloseTo(37.5, 6);

                // Median / percentiles (locks percentile behavior)
                expect(stats.median).toBeCloseTo(30, 6);
                expect(stats.p10).toBeCloseTo(10, 6);
                expect(stats.p50).toBeCloseTo(30, 6);
                expect(stats.p90).toBeCloseTo(80, 6);

                // Population std check
                expect(stats.std).toBeCloseTo(Math.sqrt(718.75), 6);
        });
    
        it('E3) Handles single-value distributions safely (no NaN/Infinity)', () => {
            const input = [
                { startTime: 0, endTime: 50, amplitudeDeg: 42 }
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs: { min: 1, max: 250 },
                },
            });

            const stats = result.session.distributions.amplitudeDeg;
            
            // All central tendency + percentile stats collapse to the single value
            expect(stats.min).toBe(42);
            expect(stats.max).toBe(42);
            expect(stats.mean).toBeCloseTo(42, 6);
            expect(stats.median).toBeCloseTo(42, 6);
            expect(stats.p10).toBeCloseTo(42, 6);
            expect(stats.p50).toBeCloseTo(42, 6);
            expect(stats.p90).toBeCloseTo(42, 6);

            // No spread with a single value
            expect(stats.std).toBeCloseTo(0, 6);

            // Extra safety: never emit NaN/Infinity for any stat
            for (const v of Object.values(stats)) {
                expect(Number.isFinite(v as number)).toBe(true);
                expect(Number.isNaN(v as number)).toBe(false);
            }
        });

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