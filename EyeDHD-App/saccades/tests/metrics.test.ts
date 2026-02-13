import { describe, it, expect } from 'vitest';
import {computeSaccadeMetrics } from '../../saccades/metrics/metrics';

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
                { startTime: 2000, endTime: 2050, amplitudeDeg: 500 },    // Filter: amplitude too large
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
            expect(result.perSaccade.length).toBe(1);
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
                    durationMs:   { min: 1, max: 250 },
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
                    durationMs:   { min: 1, max: 250 },
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
                    durationMs:   { min: 1, max: 250 },
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
                    durationMs:   { min: 1, max: 250 },
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
                    durationMs:   { min: 1, max: 250 },
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
                    durationMs:   { min: 1, max: 250 },
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
                    durationMs:   { min: 1, max: 250 },
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
                        durationMs:   { min: 1, max: 250 },
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
                    durationMs:   { min: 1, max: 250 },
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
        it('F1) Computes ISI series between consecutive kept saccades', () => {
            const input = [
                { startTime: 1000, endTime: 1050, amplitudeDeg: 5 },   
                { startTime: 1100, endTime: 1150, amplitudeDeg: 5 },   // ISI1 = 1100 - 1050 = 50ms
                { startTime: 1300, endTime: 1350, amplitudeDeg: 5 },   // ISI2 = 1300 - 1150 = 150ms
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 },
                },
            });

            // Sanity check: all events are plausible and kept
            expect(result.perSaccade.length).toBe(3);

            // ISI series is defined between consecutive saccades => length us n - 1
            expect(result.isiSeries.length).toBe(2);

            // Verify ISI values precisely
            expect(result.isiSeries[0]).toBe(50);
            expect(result.isiSeries[1]).toBe(150);

            // Safety: ISI values should never be Nan/Infinity
            for (const isi of result.isiSeries) {
                expect(Number.isFinite(isi)).toBe(true);
                expect(Number.isNaN(isi)).toBe(false);
            }
        });

        it('F2) Filter invalid ISIs (negative/overlap) and reports ISI filtered counts by reason', () => {
            const input = [
                { startTime: 1000, endTime: 1100, amplitudeDeg: 5 },
                { startTime: 1050, endTime: 1150, amplitudeDeg: 5 },   // Overlaps with previous -> ISI negative
                { startTime: 1300, endTime: 1350, amplitudeDeg: 5 },
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 },
                },
                isiPlausibleBounds: {
                    isiMs: { min: 0, max: 10_000 },
                }
            });

            // Saccades are still kept (ISI filtering is separate from saccade filtering)
            expect(result.perSaccade.length).toBe(3);

            // Only the valid ISI remains 
            expect(result.isiSeries.length).toBe(1);
            expect(result.isiSeries[0]).toBe(150);

            // Transparency for ISI filtering
            expect(result.isiFiltered.totalFiltered).toBe(1);
            expect(result.isiFiltered.byReason).toEqual({
                isi_negative_or_overlap: 1,
            });
        });

        it('F3) Computes ISI distribution stats from filtered ISI series', () => {
            const input = [
                { startTime: 1000, endTime: 1100, amplitudeDeg: 5 },
                { startTime: 1050, endTime: 1150, amplitudeDeg: 5},  // Overlap -> negative ISI
                { startTime: 1300, endTime: 1350, amplitudeDeg: 5 },
                { startTime: 1600, endTime: 1650, amplitudeDeg: 5 },
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 },
                },
                isiPlausibleBounds: {
                    isiMs: { min: 0, max: 10_000 },
                }
            });

            // Filtered ISI series should contain only valid intervals
            expect(result.isiSeries).toEqual([150, 250]);

            const stats = result.isiDistributions.isiMs;

            expect(stats.min).toBe(150);
            expect(stats.max).toBe(250);
            expect(stats.mean).toBeCloseTo(200, 6);
            expect(stats.median).toBeCloseTo(200, 6);
            expect(stats.p10).toBeCloseTo(150, 6);
            expect(stats.p50).toBeCloseTo(200, 6);
            expect(stats.p90).toBeCloseTo(250, 6);

            // Locks population standard deviation for ISI, consistent with section E
            expect(stats.std).toBeCloseTo(50, 6);
        });

        it('F4) Computes ISI histogram counts using fixed-width bins', () => {
            const input = [
                { startTime: 0,    endTime: 50,   amplitudeDeg: 5 },    // ISI1 = 100  - 50  = 50
                { startTime: 100,  endTime: 150,  amplitudeDeg: 5 },    // ISI2 = 300  - 150 = 150
                { startTime: 300,  endTime: 350,  amplitudeDeg: 5 },    // ISI3 = 600  - 350 = 250
                { startTime: 600,  endTime: 650,  amplitudeDeg: 5 },    // ISI4 = 1000 - 650 = 350
                { startTime: 1000, endTime: 1050, amplitudeDeg: 5 },   
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 },
                },
                isiPlausibleBounds: {
                    isiMs: { min: 0, max: 10_000 },
                },
                isiHistogramBinWidthMs: {
                    binSizeMs: 100,
                    maxMs: 400,
                }
            });

            // Sanity check: filtered ISIs should match what we engineered
            expect(result.isiSeries).toEqual([50, 150, 250, 350]);
            // Histogram contract
            expect(result.isiHistogram.bins.length).toBe(4);

            expect(result.isiHistogram.bins[0]).toEqual({ startMs: 0,   endMs: 100, count: 1 });    // ISI of 50  falls into [0, 100)
            expect(result.isiHistogram.bins[1]).toEqual({ startMs: 100, endMs: 200, count: 1 });    // ISI of 150 falls into [100, 200)
            expect(result.isiHistogram.bins[2]).toEqual({ startMs: 200, endMs: 300, count: 1 });    // ISI of 250 falls into [200, 300)
            expect(result.isiHistogram.bins[3]).toEqual({ startMs: 300, endMs: 400, count: 1 });    // ISI of 350 falls into [300, 400)
        });

        it('F5) Computes ISI series and distribution per segment (segment comparisons)', () => {
            const input = [
                { startTime: 1000, endTime: 1050, amplitudeDeg: 5 },     // Seg1
                { startTime: 1200, endTime: 1250, amplitudeDeg: 5 },     // Seg1
                { startTime: 2300, endTime: 2350, amplitudeDeg: 5 },     // Seg2
                { startTime: 2600, endTime: 2650, amplitudeDeg: 5 },     // Seg2
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 },
                },
                isiPlausibleBounds: {
                    isiMs: { min: 0, max: 10_000 },
                },
                segments: [
                    { id: 'seg1', startTime: 0,    endTime: 2000 },
                    { id: 'seg2', startTime: 2000, endTime: 4000 },
                ],
                isiBySegment: true,
            });

            // Overall ISI sanity check (consecutive kept saccades)
            expect(result.isiSeries).toEqual([150, 1050, 250]);

            // Contract: per-segment ISI breakdown exists when isiBySegment is true
            const seg1 = result.isiBySegment.find((s: any) => s.id === 'seg1');
            const seg2 = result.isiBySegment.find((s: any) => s.id === 'seg2');

            expect(seg1.isiSeries).toEqual([150, 1050]);
            expect(seg2.isiSeries).toEqual([250]);

            // Quick distribution sanity checks
            expect(seg1.distributions.isiMs.min).toBe(150);
            expect(seg1.distributions.isiMs.max).toBe(1050);

            expect(seg2.distributions.isiMs.min).toBe(250);
            expect(seg2.distributions.isiMs.max).toBe(250);

            // No unassigned ISIs in this scenario
            expect(result.isiSegmentsMeta.unassignedIsiCount).toBe(0);
        });
    });

    describe('G) Plot/CSV-ready Outputs', () => {
        it('G1) Emits plot/CSV-ready per-saccade rows with stable ordering', () => {
            const input = [
                { startTime: 2000, endTime: 2050, amplitudeDeg: 4 },
                { startTime: 1000, endTime: 1050, amplitudeDeg: 2 },
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 },
                },
                segments: [
                    { id: 'seg1', startTime: 0,    endTime: 1500 },
                    { id: 'seg2', startTime: 1500, endTime: 3000 },
                ],
            });

            const rows = result.perSaccadeRows;

            // One row per kept saccade
            expect(rows.length).toBe(2);
            // Rows must be ordered chronologically by startTime
            expect(rows[0].startTime).toBe(1000);
            expect(rows[1].startTime).toBe(2000);
            // Index should be stable and sequential after ordering
            expect(rows[0].index).toBe(0);
            expect(rows[1].index).toBe(1);
            // Field presence + correctness (row 0)
            expect(rows[0]).toMatchObject({
                startTime:      1000,
                endTime:        1050,
                durationMs:       50,
                amplitudeDeg:      2,
                segmentId:    'seg1',
            });
            // Derived values for sanity
            expect(rows[0].durationSec).toBeCloseTo(0.05, 6);
            expect(rows[0].ratePerSec).toBeCloseTo(40, 6);   // 2 deg / 0.05s = 40 deg/s
            // Segment assignment sanity (row 1)
            expect(rows[1].segmentId).toBe('seg2');
        });

        it('G2) Emits plot-ready time series as ordered {x,y} points', () => {
            const input = [
                { startTime: 2000, endTime: 2050, amplitudeDeg: 4 },   // rate = 4 / 0.05s = 80 deg/s
                { startTime: 1000, endTime: 1050, amplitudeDeg: 2 },   // rate = 2 / 0.05s = 40 deg/s
                { startTime: 3000, endTime: 3100, amplitudeDeg: 3 },   // rate = 3 / 0.1s  = 30 deg/s
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 },
                },
                series: {
                    saccadeRatePerSecOverTime: true,
                    amplitudeDegOverTime: true,
                },
            });

            const rateSeries = result.series.saccadeRatePerSecOverTime;
            const ampSeries = result.series.amplitudeDegOverTime;

            // Both series should exist and have one point per kept saccade
            expect(rateSeries.length).toBe(3);
            expect(ampSeries.length).toBe(3);
            // Chronological ordering by x (startTime)
            expect(rateSeries.map((p: any) => p.x)).toEqual([1000, 2000, 3000]);
            expect(ampSeries.map((p: any) => p.x)).toEqual([1000, 2000, 3000]);
            // Values should match expected derived metrics
            expect(rateSeries.map((p: any) => p.y)).toEqual([40, 80, 30]);
            expect(ampSeries.map((p: any) => p.y)).toEqual([2, 4, 3]);
            // Shape guarantee: {x,y} are finite numbers
            for (const p of [...rateSeries, ...ampSeries]) {
                expect(Number.isFinite(p.x)).toBe(true);
                expect(Number.isFinite(p.y)).toBe(true);
            }
        });

        it('G3) Emits CSV-ready session + segment summary rows with stable columns', () => {
            const input = [
                // seg1 [0,2000): two kept]
                { startTime: 500,  endTime: 550,  amplitudeDeg: 5 },
                { startTime: 1500, endTime: 1550, amplitudeDeg: 5 },
                // seg2 [2000,4000): one filtered by amplitude ]
                { startTime: 2500, endTime: 2550, amplitudeDeg: 999 },
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 },
                },
                segments: [
                    { id: 'seg1', startTime: 0,    endTime: 2000 },
                    { id: 'seg2', startTime: 2000, endTime: 4000 },
                ],
                csv: {
                    sessionSummaryRow: true,
                    segmentSummaryRows: true,
                },
            });
            
            // Session CSV row exists and is flat
            const sessionRow = result.csv.sessionSummaryRow;
            expect( typeof sessionRow).toBe('object');
            // Stable keys (minimum contract)
            expect(sessionRow).toMatchObject({
                sessionId: null,
                keptCount: 2,
                filteredCount: 1,
            });
            expect(sessionRow.durationMs).toBe(1050); // min start = 500, max end = 1550 (filtered excluded) -> 1550 - 500 = 1050
            expect(sessionRow.durationSec).toBeCloseTo(1.05, 6);
            expect(sessionRow.ratePerSec).toBeCloseTo(2 / 1.05, 6);
            // ratePerMin omitted unless includeRatePerMin is enabled (locked in C3)
            expect(sessionRow.ratePerMin).toBeUndefined();
            // Segment CSV rows exist and are flat
            const segRows = result.csv.segmentSummaryRows;
            expect(Array.isArray(segRows)).toBe(true);
            expect(segRows.length).toBe(2);

            const seg1 = segRows.find((r: any) => r.segmentId === 'seg1');
            const seg2 = segRows.find((r: any) => r.segmentId === 'seg2');
            // Segment 1: duration 2000ms, kept 2 => rate 1/s
            expect(seg1).toMatchObject({ segmentId: 'seg1', keptCount: 2 });
            expect(seg1.durationMs).toBe(2000);
            expect(seg1.durationSec).toBeCloseTo(2, 6);
            expect(seg1.ratePerSec).toBeCloseTo(1, 6);
            expect(seg1.ratePerMin).toBeUndefined();
            // Segment 2: duration 2000ms, kept 0 => rate 0/s
            expect(seg2).toMatchObject({ segmentId: 'seg2', keptCount: 0 });
            expect(seg2.durationMs).toBe(2000);
            expect(seg2.durationSec).toBeCloseTo(2, 6);
            expect(seg2.ratePerSec).toBeCloseTo(0, 6);
            expect(seg2.ratePerMin).toBeUndefined();
        });
    });

    describe('H) Ordering guarantees', () => {
        it('H1) Enforces stable chronological ordering across rows and series', () => {
            const input = [
                { startTime: 2000, endTime: 2050, amplitudeDeg: 4 },    // A
                { startTime: 1000, endTime: 1070, amplitudeDeg: 2 },    // B
                { startTime: 1000, endTime: 1050, amplitudeDeg: 3 },    // C (same startTime as B, different endTime)
            ];

            const result = computeSaccadeMetrics(input, {
                plausibleBounds: {
                    amplitudeDeg: { min: 0, max: 100 },
                    durationMs:   { min: 1, max: 250 },
                },
                // Enable series to ensure it follows the same order ontract
                series: {
                    amplitudeDegOverTime: true,
                },
                // Also compute ISI for ordered-consecutive correctness
                isiPlausibleBounds: {
                    isiMs: { min: 0, max: 10_000 },
                }
            });

            // Expected sort order: C (1000, 1050), B: (1000, 1070), A: (2000, 2050)
            // perSaccadeRows must follow the stable ordering guarantee
            expect(result.perSaccadeRows.map((r: any) => [r.startTime, r.endTime])).toEqual([
                [1000, 1050],   // C
                [1000, 1070],   // B
                [2000, 2050],   // A
            ]);

            // perSaccade (structured objects) should align with the same order
            expect(result.perSaccade.map((s: any) => [s.startTime, s.endTime])).toEqual([
                [1000, 1050],   // C
                [1000, 1070],   // B
                [2000, 2050],   // A
            ]);
            
            // amplitudeDegOverTime series must align with chronological order
            expect(result.series.amplitudeDegOverTime.map((p: any) => [p.x, p.y])).toEqual([
                [1000, 3],   // C
                [1000, 2],   // B
                [2000, 4],   // A
            ]);

            // ISI computed on ordered saccades:
            // ISI1 = B.start(1000) - C.end(1050) = -50 (negative, should be filtered out)
            // ISI2 = A.start(2000) - B.end(1070) = 930 (valid)
            expect(result.isiSeries).toEqual([930]);

        });

    });
});