import { describe, it, expect } from 'vitest';
import { prepareVisualizationModels } from '@saccades/visualization/prep/index';
import type {
    VisualizationPrepInput,
    VisualizationPrepResult,
    VisualizationMarker,
} from '@saccades/visualization/prep/index';

function deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

function isPlainData(value: unknown): boolean {
    if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return true;
    }

    if (Array.isArray(value)) {
        return value.every(isPlainData);
    }

    if (typeof value === 'object') {
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) {
            return false;
        }

        return Object.values(value as Record<string, unknown>).every(isPlainData);
    }

    return false;
}

describe('Visualization Prep Layer', () => {
    describe('A — Scatter model generation', () => {
        it('A1) — Converts per-saccade analysis data into scatter points with timeMs and amplitudeDeg', () => {
            const input: VisualizationPrepInput = {            // Partial input focused on perSaccade
                perSaccade: [
                    { timeMs: 100, amplitudeDeg: 2.5 },
                    { timeMs: 250, amplitudeDeg: 5.0 },
                    { timeMs: 400, amplitudeDeg: 1.25 },
                ],
            };

            const result = prepareVisualizationModels(input);  // Pass through to scatter generation, no special options needed

            expect(result.scatter.points).toEqual([            // Expect scatter points to match input saccades with correct properties
                { timeMs: 100, amplitudeDeg: 2.5 },
                { timeMs: 250, amplitudeDeg: 5.0 },
                { timeMs: 400, amplitudeDeg: 1.25 },
            ]);
        });

        it('A2) — Preserves deterministic ordering of scatter points', () => {
            const input: VisualizationPrepInput = {            // Partial input focused on perSaccade with out-of-order times to test sorting/stability
                perSaccade: [
                    { timeMs: 500, amplitudeDeg: 1.0 },
                    { timeMs: 100, amplitudeDeg: 2.0 },
                    { timeMs: 300, amplitudeDeg: 3.0 },
                ],
            };

            const result = prepareVisualizationModels(input);  // Pass through to scatter generation, no special options needed

            expect(result.scatter.points).toEqual([            // Expect scatter points to be in the same order as input, preserving stability even if times are out of order
                { timeMs: 500, amplitudeDeg: 1.0 },
                { timeMs: 100, amplitudeDeg: 2.0 },
                { timeMs: 300, amplitudeDeg: 3.0 },
            ]);
        });

        it('A3) — Includes segment association when available', () => {
            const input: VisualizationPrepInput = {            // Partial input focused on perSaccade with segmentId to test segment association in scatter points
                perSaccade: [
                    { timeMs: 100, amplitudeDeg: 2.0, segmentId: 'baseline' },
                    { timeMs: 600, amplitudeDeg: 3.5, segmentId: 'task' },
                ],
            };

            const result = prepareVisualizationModels(input);  // Pass through to scatter generation, no special options needed

            expect(result.scatter.points).toEqual([            // Expect scatter points to include segmentId when provided in input saccades
                { timeMs: 100, amplitudeDeg: 2.0, segmentId: 'baseline' },
                { timeMs: 600, amplitudeDeg: 3.5, segmentId: 'task' },
            ]);
        });
    });

    describe('B — Rate series generation', () => {
        it('B1) — Generates rate-per-second series using a chosen bin width', () => {
            const input: VisualizationPrepInput = {             // Partial input focused on perSaccade with multiple saccades to test rate series generation with specific bin width
                perSaccade: [
                    { timeMs: 100, amplitudeDeg: 1.0 },
                    { timeMs: 400, amplitudeDeg: 2.0 },
                    { timeMs: 1200, amplitudeDeg: 3.0 },
                    { timeMs: 1800, amplitudeDeg: 4.0 },
                ],
            };

            const result = prepareVisualizationModels(input, {  // Pass through to rate series generation with specific bin width option
                rateBinWidthMs: 1000,
            });

            expect(result.rateSeries).toEqual({                 // Expect rate series to have correct bin width and points calculated based on input saccades and binning logic
                binWidthMs: 1000,
                points: [
                    { timeMs: 500, count: 2, ratePerSec: 2 },
                    { timeMs: 1500, count: 2, ratePerSec: 2 },
                ],
            });
        });

        it('B2) — Produces deterministic bin centers/timestamps', () => {
            const input: VisualizationPrepInput = {                          // Partial input focused on perSaccade with saccades placed to test deterministic bin center calculation in rate series generation
                perSaccade: [
                    { timeMs: 50, amplitudeDeg: 1.0 },
                    { timeMs: 1050, amplitudeDeg: 1.0 },
                    { timeMs: 2050, amplitudeDeg: 1.0 },
                ],
            };

            const result = prepareVisualizationModels(input, {               // Pass through to rate series generation with specific bin width option to test deterministic bin center calculation
                rateBinWidthMs: 1000,
            });

            expect(result.rateSeries.points.map((p) => p.timeMs)).toEqual([  // Expect bin centers to be deterministic and correctly calculated based on bin width and input saccade times
                500,
                1500,
                2500,
            ]);
        });

        it('B3) — Handles empty segments or empty analysis inputs gracefully', () => {
            const emptyAnalysisInput: VisualizationPrepInput = {             // Empty input focused on testing graceful handling of empty perSaccade and segments for rate series generation
                perSaccade: [],
                segments: [],
            };

            const result = prepareVisualizationModels(emptyAnalysisInput, {  // Pass through to rate series generation with specific bin width option
                rateBinWidthMs: 1000,
            });

            expect(result.rateSeries).toEqual({                              // Expect rate series to handle empty input gracefully by returning correct structure with empty points array
                binWidthMs: 1000,
                points: [],
            });
        });
    });

    describe('C — ISI histogram generation', () => {
        it('C1) — Converts ISI values into histogram-ready binEdges and counts', () => {
            const input: VisualizationPrepInput = {             // Partial input focused on isiValuesMs to test ISI histogram generation with specific bin width
                isiValuesMs: [10, 40, 60, 90],
            };

            const result = prepareVisualizationModels(input, {  // Pass through to ISI histogram generation with specific bin width option
                isiBinWidthMs: 50,
            });

            expect(result.isiHistogram).toEqual({               // Expect ISI histogram to have correct bin width, edges, and counts based on input ISI values and binning logic
                binWidthMs: 50,
                binEdges: [0, 50, 100],
                counts: [2, 2],
            });
        });

        it('C2) — Respects chosen histogram bin width', () => {
            const input: VisualizationPrepInput = {             // Partial input focused on isiValuesMs to test ISI histogram generation with different bin width
                isiValuesMs: [5, 20, 45, 80],
            };

            const result = prepareVisualizationModels(input, {  // Pass through to ISI histogram generation with different bin width option
                isiBinWidthMs: 20,
            });

            expect(result.isiHistogram).toEqual({               // Expect ISI histogram to reflect the chosen bin width in its edges and counts based on input ISI values
                binWidthMs: 20,
                binEdges: [0, 20, 40, 60, 80, 100],
                counts: [1, 1, 1, 0, 1],
            });
        });

        it('C3) — Handles empty ISI input gracefully', () => {
            const input: VisualizationPrepInput = {             // Partial input focused on empty isiValuesMs to test graceful handling of empty ISI input for histogram generation
                isiValuesMs: [],
            };

            const result = prepareVisualizationModels(input, {  // Pass through to ISI histogram generation with specific bin width option
                isiBinWidthMs: 25,
            });

            expect(result.isiHistogram).toEqual({               // Expect ISI histogram to handle empty input gracefully by returning correct structure with empty edges and counts
                binWidthMs: 25,
                binEdges: [],
                counts: [],
            });
        });
    });

    describe('D — Marker / overlay generation', () => {
        it('D1) — Converts distractor/event markers into visualization marker primitives', () => {
            const input: VisualizationPrepInput = {  // Partial input focused on markers to test conversion of event markers into visualization marker primitives
                markers: [
                    { timeNs: 1_500_000, type: 'DISTRACTOR_ON', label: 'D1' },
                    { timeNs: 2_250_000, type: 'DISTRACTOR_OFF', label: 'D1 end' },
                ],
            };

            const result = prepareVisualizationModels(input, {  // Pass through to marker generation with option to include markers
                includeMarkers: true,
            });

            expect(result.markers).toContainEqual<VisualizationMarker>({  // Expect markers to include converted event markers with correct properties for visualization overlay
                kind: 'event',
                timeMs: 1.5,
                type: 'DISTRACTOR_ON',
                label: 'D1',
            });

            expect(result.markers).toContainEqual<VisualizationMarker>({  // Expect markers to include converted event markers with correct properties for visualization overlay
                kind: 'event',
                timeMs: 2.25,
                type: 'DISTRACTOR_OFF',
                label: 'D1 end',
            });
        });

        it('D2) — Includes segment boundary markers when segments are present', () => {
            const input: VisualizationPrepInput = {  // Partial input focused on segments to test conversion of segment boundaries into visualization marker primitives
                segments: [
                    { id: 'segA', startTimeMs: 0, endTimeMs: 1000, label: 'Baseline' },
                    { id: 'segB', startTimeMs: 1000, endTimeMs: 2500, label: 'Task' },
                ],
            };

            const result = prepareVisualizationModels(input, {  // Pass through to marker generation with option to include markers
                includeMarkers: true,
            });

            expect(result.markers).toContainEqual({  // Expect markers to include converted segment start marker for first segment with correct properties for visualization overlay
                kind: 'segment_start',
                timeMs: 0,
                type: 'SEGMENT_START',
                label: 'Baseline',
                segmentId: 'segA',
            });

            expect(result.markers).toContainEqual({  // Expect markers to include converted segment end marker for first segment with correct properties for visualization overlay
                kind: 'segment_end',
                timeMs: 1000,
                type: 'SEGMENT_END',
                label: 'Baseline',
                segmentId: 'segA',
            });

            expect(result.markers).toContainEqual({  // Expect markers to include converted segment start marker for second segment with correct properties for visualization overlay
                kind: 'segment_start',
                timeMs: 1000,
                type: 'SEGMENT_START',
                label: 'Task',
                segmentId: 'segB',
            });

            expect(result.markers).toContainEqual({  // Expect markers to include converted segment end marker for second segment with correct properties for visualization overlay
                kind: 'segment_end',
                timeMs: 2500,
                type: 'SEGMENT_END',
                label: 'Task',
                segmentId: 'segB',
            });
        });

        it('D3) — Preserves label/type information for overlays', () => {
            const input: VisualizationPrepInput = {  // Partial input focused on markers and segments to test preservation of label and type information in visualization marker primitives
                markers: [
                    { timeNs: 3_000_000, type: 'DISTRACTOR_ON', label: 'Auditory Cue' },
                ],
                segments: [
                    { id: 'seg1', startTimeMs: 0, endTimeMs: 5000, label: 'Trial 1' },
                ],
            };

            const result = prepareVisualizationModels(input, {  // Pass through to marker generation with option to include markers
                includeMarkers: true,
            });

            expect(result.markers).toContainEqual({  // Expect markers to include converted event marker with preserved type and label information for visualization overlay
                kind: 'event',
                timeMs: 3,
                type: 'DISTRACTOR_ON',
                label: 'Auditory Cue',
            });

            expect(result.markers).toContainEqual({  // Expect markers to include converted segment start marker with preserved label and type information for visualization overlay
                kind: 'segment_start',
                timeMs: 0,
                type: 'SEGMENT_START',
                label: 'Trial 1',
                segmentId: 'seg1',
            });
        });
    });

    describe('E — Diagnostics / safety / determinism', () => {
        it('E1 — does not mutate input structures', () => {
            const input: VisualizationPrepInput = {
                perSaccade: [
                    { timeMs: 100, amplitudeDeg: 2.0, segmentId: 'seg1', sourceIndex: 0 },
                ],
                isiValuesMs: [10, 20, 30],
                markers: [
                    { timeNs: 1_000_000, type: 'DISTRACTOR_ON', label: 'D1' },
                ],
                segments: [
                    { id: 'seg1', startTimeMs: 0, endTimeMs: 500, label: 'Baseline' },
                ],
            };

            const before = deepClone(input);
            const originalPerSaccadeRef = input.perSaccade;
            const originalIsiRef = input.isiValuesMs;
            const originalMarkersRef = input.markers;
            const originalSegmentsRef = input.segments;

            prepareVisualizationModels(input, {
                rateBinWidthMs: 1000,
                isiBinWidthMs: 25,
                includeMarkers: true,
            });

            expect(input).toEqual(before);
            expect(input.perSaccade).toBe(originalPerSaccadeRef);
            expect(input.isiValuesMs).toBe(originalIsiRef);
            expect(input.markers).toBe(originalMarkersRef);
            expect(input.segments).toBe(originalSegmentsRef);
        });

        it('E2 — returns deep-equal results for identical inputs', () => {
            const input: VisualizationPrepInput = {
                perSaccade: [
                    { timeMs: 100, amplitudeDeg: 1.0, segmentId: 'A' },
                    { timeMs: 1200, amplitudeDeg: 3.0, segmentId: 'B' },
                ],
                isiValuesMs: [15, 35, 55],
                markers: [
                    { timeNs: 2_000_000, type: 'DISTRACTOR_ON', label: 'D1' },
                ],
                segments: [
                    { id: 'A', startTimeMs: 0, endTimeMs: 1000, label: 'Baseline' },
                    { id: 'B', startTimeMs: 1000, endTimeMs: 2000, label: 'Task' },
                ],
            };

            const result1 = prepareVisualizationModels(input, {
                rateBinWidthMs: 1000,
                isiBinWidthMs: 20,
                includeMarkers: true,
            });

            const result2 = prepareVisualizationModels(input, {
                rateBinWidthMs: 1000,
                isiBinWidthMs: 20,
                includeMarkers: true,
            });

            expect(result1).toEqual(result2);
        });

        it('E3 — remains plotting-framework agnostic by returning plain data objects only', () => {
            const input: VisualizationPrepInput = {
                perSaccade: [
                    { timeMs: 100, amplitudeDeg: 2.0 },
                ],
                isiValuesMs: [25, 50],
                markers: [
                    { timeNs: 1_000_000, type: 'DISTRACTOR_ON', label: 'D1' },
                ],
                segments: [
                    { id: 'seg1', startTimeMs: 0, endTimeMs: 1000, label: 'Trial 1' },
                ],
            };

            const result = prepareVisualizationModels(input, {
                rateBinWidthMs: 1000,
                isiBinWidthMs: 25,
                includeMarkers: true,
            });

            expect(isPlainData(result)).toBe(true);
        });
    });

    describe('F — Output shape compatibility', () => {
        it('F1 — returns a single top-level result containing scatter, rateSeries, isiHistogram, and markers', () => {
            const input: VisualizationPrepInput = {
                perSaccade: [{ timeMs: 100, amplitudeDeg: 2.5 }],
                isiValuesMs: [20, 40],
                markers: [{ timeNs: 1_000_000, type: 'DISTRACTOR_ON', label: 'D1' }],
                segments: [{ id: 'seg1', startTimeMs: 0, endTimeMs: 500, label: 'Baseline' }],
            };

            const result = prepareVisualizationModels(input, {
                includeMarkers: true,
            });

            expect(result).toHaveProperty('scatter');
            expect(result).toHaveProperty('rateSeries');
            expect(result).toHaveProperty('isiHistogram');
            expect(result).toHaveProperty('markers');
        });

        it('F2 — output is suitable for downstream charting/export layers without further normalization', () => {
            const input: VisualizationPrepInput = {
                perSaccade: [
                    { timeMs: 100, amplitudeDeg: 2.0, segmentId: 'seg1', sourceIndex: 0 },
                    { timeMs: 1100, amplitudeDeg: 4.0, segmentId: 'seg2', sourceIndex: 1 },
                ],
                isiValuesMs: [20, 45, 80],
                markers: [
                    { timeNs: 2_000_000, type: 'DISTRACTOR_ON', label: 'D1' },
                ],
                segments: [
                    { id: 'seg1', startTimeMs: 0, endTimeMs: 1000, label: 'Baseline' },
                    { id: 'seg2', startTimeMs: 1000, endTimeMs: 2000, label: 'Task' },
                ],
            };

            const result: VisualizationPrepResult = prepareVisualizationModels(input, {
                rateBinWidthMs: 1000,
                isiBinWidthMs: 20,
                includeMarkers: true,
            });

            // Scatter is already chart-ready
            expect(result.scatter.points[0]).toEqual({
                timeMs: 100,
                amplitudeDeg: 2.0,
                segmentId: 'seg1',
                sourceIndex: 0,
            });

            // Rate series is already time/value chart-ready
            expect(result.rateSeries.points[0]).toEqual({
                timeMs: 500,
                count: 1,
                ratePerSec: 1,
            });

            // Histogram is already bin/count ready
            expect(result.isiHistogram.binEdges).toEqual([0, 20, 40, 60, 80, 100]);
            expect(result.isiHistogram.counts).toEqual([0, 1, 1, 0, 1]);

            // Markers are already overlay-ready
            expect(result.markers).toContainEqual({
                kind: 'event',
                timeMs: 2,
                type: 'DISTRACTOR_ON',
                label: 'D1',
            });
        });
    });
});