import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Vec3 } from '@saccades/core/velocities';
import type {
  TimedVectorStream,
  SegmentSpec,
  ExperimentMarker,
} from '@saccades/ingest/segmentation/types';
import type { SaccadeDetectionOptions } from '@saccades/core/schema';
import type { SaccadeMetricsOptions } from '@saccades/metrics/types';


/**
 * Step 4 contracts locked by these tests:
 * - Time windows are treated as half-open: include samples where startTimeNs <= t < endTimeNs
 * - startIndex is first index with t >= startTimeNs
 * - endIndex is first index with t >= endTimeNs (exclusive bound), or vectors.length if none
 * - Marker ranges:
 *   - startTimeNs = time of the first startMarker occurrence (by marker.type)
 *   - endTimeNs   = time of the first endMarker occurrence AFTER that start marker
 * - Missing marker behavior: throw typed SegmentMarkerNotFoundError
 * - Deterministic, no mutation, stable ordering
 * - analyzeSaccadesFromVectors invoked once per segment with the correct vector slice
 */

// Deep-freeze helper to ensure no mutation (S6)
function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    Object.freeze(obj);
    for (const key of Object.getOwnPropertyNames(obj)) {
      // @ts-expect-error - indexing unknown object
      const value = obj[key];
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        deepFreeze(value);
      }
    }
  }
  return obj;
}

type MockAnalyzeImpl = (...args: unknown[]) => unknown;
// Helper to load the module under test with a mocked analyzeSaccadesFromVectors implementation.
async function loadWithAnalyzerMock(mockImpl?: MockAnalyzeImpl) {
  vi.resetModules();

  const analyzeMock = vi.fn(mockImpl ?? (() => ({ ok: true })));

  // IMPORTANT: this path must match what segmentAndAnalyzeStream.ts will import.
  vi.doMock('@saccades/index', () => {
    return { analyzeSaccadesFromVectors: analyzeMock };
  });

  const mod = await import('../ingest/segmentation/segmentAndAnalyzeStream');
  return {
    segmentAndAnalyzeStream: mod.segmentAndAnalyzeStream as typeof import('../ingest/segmentation/segmentAndAnalyzeStream').segmentAndAnalyzeStream,
    SegmentMarkerNotFoundError: mod.SegmentMarkerNotFoundError,
    analyzeMock,
  };
}
// Ensure no mock state leaks between tests
beforeEach(() => {
  vi.restoreAllMocks();
});

describe('segmentAndAnalyzeStream (Step 4)', () => {
  it('S1) — Time range segmentation basics: computes correct startIndex/endIndex from time ranges', async () => {
    // Simple mock since this test only cares about bounds, not analysis results
    const { segmentAndAnalyzeStream } = await loadWithAnalyzerMock(() => ({ ok: true }));  

    // Times at 0,10,20,30,40
    const stream = {  // Times at 0,10,20,30,40
      timesNs: [0, 10, 20, 30, 40],
      vectors: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ] satisfies Vec3[],
    };

    // Note: these specs intentionally overlap to also test that they don't interfere with each other's bounds calculations
    const specs = [  
      { kind: 'timeRange', id: 'A', startTimeNs: 10, endTimeNs: 30 }, // includes t=10,20 => idx [1,3)
      { kind: 'timeRange', id: 'B', startTimeNs: 0, endTimeNs: 50 },  // includes all => idx [0,5)
      { kind: 'timeRange', id: 'C', startTimeNs: 15, endTimeNs: 16 }, // includes none => idx [2,2)
    ] as const;

    const result = segmentAndAnalyzeStream(stream, specs);            // Run segmentation

    expect(result.segments).toHaveLength(3);                          // All specs should produce a segment, even if empty

    expect(result.segments[0].id).toBe('A');                          // Check bounds for segment A
    expect(result.segments[0].bounds).toEqual({                       // Check bounds of first element
      startTimeNs: 10,                                                // Includes t=10
      endTimeNs: 30,                                                  // Excludes t=30
      startIndex: 1,                                                  // First index with t >= 10 is idx 1 (t=10)
      endIndex: 3,                                                    // First index with t >= 30 is idx 3 (t=30), exclusive bound
    });

    expect(result.segments[1].id).toBe('B');                          // Check bounds for segment B
    expect(result.segments[1].bounds).toEqual({
      startTimeNs: 0,                                                // Includes t=0
      endTimeNs: 50,                                                 // Excludes t=50
      startIndex: 0,                                                 // First index with t >= 0 is idx 0 (t=0)
      endIndex: 5,                                                   // First index with t >= 50 is idx 5 (t=50), exclusive bound
    });

    expect(result.segments[2].id).toBe('C');                          // Check bounds for segment C (empty segment case)
    expect(result.segments[2].bounds).toEqual({
      startTimeNs: 15,                                                // Includes t=15
      endTimeNs: 16,                                                  // Excludes t=16
      startIndex: 2,                                                  // First index with t >= 15 is idx 2 (t=20)
      endIndex: 2,                                                    // First index with t >= 16 is also idx 2 (t=20), exclusive bound, empty segment
    });
  });

  it('S2) — Traceability slicing: slices sourceRowIndices aligned to vector slice', async () => {
    // Load with a simple mock since this test only cares about sourceRowIndices slicing, not analysis results
    const { segmentAndAnalyzeStream } = await loadWithAnalyzerMock(() => ({ ok: true }));
    // Stream with sourceRowIndices aligned to timesNs/vectors
    const stream = {
      timesNs: [0, 10, 20, 30, 40],
      vectors: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ] satisfies Vec3[],
      sourceRowIndices: [100, 101, 102, 103, 104],
    };

    // Segment spec that includes t=10,20,30 => idx [1,4) => should include sourceRowIndices [101,102,103]
    const specs = [{ kind: 'timeRange', id: 'A', startTimeNs: 10, endTimeNs: 40 }] as const; 
    // Run segmentation
    const result = segmentAndAnalyzeStream(stream, specs);
    // Verify that the segment's sourceRowIndices are correctly sliced to match the vector slice for that segment
    expect(result.segments[0].sourceRowIndices).toEqual([101, 102, 103]);
  });

  it('S3) — Marker range segmentation basics: computes correct time/index bounds from markers', async () => {
    const { segmentAndAnalyzeStream } = await loadWithAnalyzerMock(() => ({ ok: true }));

    const stream = {
      timesNs: [0, 10, 20, 30, 40, 50, 60],
      vectors: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
        { x: 5, y: 0, z: 0 },
        { x: 6, y: 0, z: 0 },
      ] satisfies Vec3[],
    };

    const markers = [
      { timeNs: 10, type: 'TRIAL_START' },
      { timeNs: 40, type: 'DISTRACTOR_ON' },
      { timeNs: 60, type: 'TRIAL_END' },
    ];

    const specs = [
      { kind: 'markerRange', id: 'T1', startMarker: 'TRIAL_START', endMarker: 'DISTRACTOR_ON' },
    ] as const;

    const result = segmentAndAnalyzeStream(stream, specs, { markers });

    // startTime=10, endTime=40 => include t=10,20,30 => idx [1,4)
    expect(result.segments[0].bounds).toEqual({
      startTimeNs: 10,
      endTimeNs: 40,
      startIndex: 1,
      endIndex: 4,
    });
  });

  it('S4) — Missing marker handling: throws SegmentMarkerNotFoundError (locked behavior)', async () => {
    // We only need a simple mock since this test is about error handling before analysis is even called
    const { segmentAndAnalyzeStream, SegmentMarkerNotFoundError } = await loadWithAnalyzerMock(() => ({ ok: true }));
    // Stream with times but markers are missing the required end marker
    const stream = {
      timesNs: [0, 10, 20],
      vectors: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
      ] satisfies Vec3[],
    };
    // Markers array includes the start marker but is missing the corresponding end marker
    const markers = [{ timeNs: 10, type: 'TRIAL_START' }]; 
    // Segment spec that looks for a marker range that cannot be fulfilled due to the missing end marker
    const specs = [
      { kind: 'markerRange', id: 'BAD', startMarker: 'TRIAL_START', endMarker: 'TRIAL_END' },
    ] as const;
    // We expect the function to throw a SegmentMarkerNotFoundError indicating that the end marker is missing
    expect(() => segmentAndAnalyzeStream(stream, specs, { markers })).toThrow(SegmentMarkerNotFoundError);
  });

  it('S5) — Determinism: identical inputs produce deep-equal outputs', async () => {
    // Mock implementation that returns some analysis result based on the input vectors, to ensure we're testing the full flow including analysis results in the output
    const { segmentAndAnalyzeStream } = await loadWithAnalyzerMock((vectors: Vec3[]) => ({
      ok: true,
      count: vectors.length,
      first: vectors[0]?.x ?? null,
      last: vectors[vectors.length - 1]?.x ?? null,
    }));
    // Stream with times and vectors
    const stream = {
      timesNs: [0, 10, 20, 30, 40],
      vectors: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ] satisfies Vec3[],
      sourceRowIndices: [10, 11, 12, 13, 14],
    };
    // Segment specs that will produce some segments with vectors to analyze
    const specs = [
      { kind: 'timeRange', id: 'A', startTimeNs: 10, endTimeNs: 40 },
      { kind: 'timeRange', id: 'B', startTimeNs: 0, endTimeNs: 20 },
    ] as const;
    // Run the segmentation and analysis twice with the same inputs and verify that the outputs are deeply equal, ensuring determinism
    const r1 = segmentAndAnalyzeStream(stream, specs);
    const r2 = segmentAndAnalyzeStream(stream, specs);
    // We use toEqual for deep equality check since the output is an object with nested structures, and we want to ensure that all nested properties are equal as well
    expect(r1).toEqual(r2);
  });

  it('S6) — No mutation: does not mutate stream, segment specs, or markers', async () => {
    const { segmentAndAnalyzeStream } = await loadWithAnalyzerMock(() => ({ ok: true }));

    const stream = deepFreeze({
      timesNs: [0, 10, 20, 30],
      vectors: deepFreeze([
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
      ] satisfies Vec3[]),
      sourceRowIndices: deepFreeze([100, 101, 102, 103]),
    });

    const markers = deepFreeze([
      { timeNs: 10, type: 'TRIAL_START', payload: deepFreeze({ n: 1 }) },
      { timeNs: 30, type: 'TRIAL_END', payload: deepFreeze({ n: 2 }) },
    ]);

    const specs = deepFreeze([
      { kind: 'markerRange', id: 'M', startMarker: 'TRIAL_START', endMarker: 'TRIAL_END' },
      { kind: 'timeRange', id: 'T', startTimeNs: 0, endTimeNs: 20 },
    ] as const);

    const streamBefore = JSON.stringify(stream);
    const markersBefore = JSON.stringify(markers);
    const specsBefore = JSON.stringify(specs);

    expect(() => segmentAndAnalyzeStream(
      stream as TimedVectorStream, 
      specs as readonly SegmentSpec[], 
      { markers: markers as ExperimentMarker[] })).not.toThrow();

    expect(JSON.stringify(stream)).toBe(streamBefore);
    expect(JSON.stringify(markers)).toBe(markersBefore);
    expect(JSON.stringify(specs)).toBe(specsBefore);
  });

  it('S7) — Analysis invocation: analyzeSaccadesFromVectors called once per segment with correct vector slice', async () => {
    const emptyResult = { ok: true, kind: 'analysis', count: 0 };
    const nonEmptyResult = (n: number) => ({ ok: true, kind: 'analysis', count: n });

    const { segmentAndAnalyzeStream, analyzeMock } = await loadWithAnalyzerMock((vectors: Vec3[]) => {
      return vectors.length === 0 ? emptyResult : nonEmptyResult(vectors.length);
    });

    const stream = {
      timesNs: [0, 10, 20, 30, 40],
      vectors: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ] satisfies Vec3[],
    };

    const specs = [
      { kind: 'timeRange', id: 'A', startTimeNs: 10, endTimeNs: 30 }, // idx [1,3) => 2 vectors
      { kind: 'timeRange', id: 'B', startTimeNs: 15, endTimeNs: 16 }, // idx [2,2) => 0 vectors
    ] as const;

    const result = segmentAndAnalyzeStream(stream, specs, {
      detection: { velocityThresholdDegPerSec: 123 } as Partial<SaccadeDetectionOptions>,
      metrics: { someMetricsOption: true } as SaccadeMetricsOptions,
    });

    expect(analyzeMock).toHaveBeenCalledTimes(2);

    // Segment A slice
    const callA = analyzeMock.mock.calls[0];
    expect(callA[0]).toEqual(stream.vectors.slice(1, 3));
    // detection + metrics should be forwarded (same object identity not required, but content should match)
    expect(callA[1]).toEqual({ velocityThresholdDegPerSec: 123 });
    expect(callA[2]).toEqual({ someMetricsOption: true });

    // Segment B slice (empty)
    const callB = analyzeMock.mock.calls[1];
    expect(callB[0]).toEqual([]);
    expect(callB[1]).toEqual({ velocityThresholdDegPerSec: 123 });
    expect(callB[2]).toEqual({ someMetricsOption: true });

    expect(result.segments[0].analysis).toEqual(nonEmptyResult(2));
    expect(result.segments[1].analysis).toEqual(emptyResult);
  });

  it('S8) — Ordering guarantees: segments returned in spec order; vectors preserve original order', async () => {
    const { segmentAndAnalyzeStream, analyzeMock } = await loadWithAnalyzerMock((vectors: Vec3[]) => ({
      xs: vectors.map(v => v.x),
    }));

    const stream = {
      timesNs: [0, 10, 20, 30, 40],
      vectors: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
      ] satisfies Vec3[],
    };

    const specs = [
      { kind: 'timeRange', id: 'B', startTimeNs: 20, endTimeNs: 50 }, // idx [2,5) => x [2,3,4]
      { kind: 'timeRange', id: 'A', startTimeNs: 0, endTimeNs: 20 },  // idx [0,2) => x [0,1]
    ] as const;

    const result = segmentAndAnalyzeStream(stream, specs);

    // Spec order preserved
    expect(result.segments.map(s => s.id)).toEqual(['B', 'A']);

    // Each segment preserves original vector order (no sorting/reordering)
    expect(result.segments[0].analysis).toEqual({ xs: [2, 3, 4] });
    expect(result.segments[1].analysis).toEqual({ xs: [0, 1] });

    // Also verify the actual calls preserve order
    const firstCallVectors = analyzeMock.mock.calls[0][0] as Vec3[];
    const secondCallVectors = analyzeMock.mock.calls[1][0] as Vec3[];
    expect(firstCallVectors.map(v => v.x)).toEqual([2, 3, 4]);
    expect(secondCallVectors.map(v => v.x)).toEqual([0, 1]);
  });

  it('S9) — Empty segment behavior: no samples => valid segment entry with empty analysis', async () => {
    const emptyAnalysis = { ok: true, empty: true };

    const { segmentAndAnalyzeStream, analyzeMock } = await loadWithAnalyzerMock((vectors: Vec3[]) => {
      // Contract: analyzer should be called even for empty slices; returns emptyAnalysis
      if (vectors.length === 0) return emptyAnalysis;
      return { ok: true, empty: false, n: vectors.length };
    });

    const stream = {
      timesNs: [0, 10, 20],
      vectors: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
      ] satisfies Vec3[],
    };

    const specs = [
      { kind: 'timeRange', id: 'EMPTY', startTimeNs: 11, endTimeNs: 19 }, // between samples => idx [2,2)
    ] as const;

    const result = segmentAndAnalyzeStream(stream, specs);

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].id).toBe('EMPTY');
    expect(result.segments[0].bounds).toEqual({
      startTimeNs: 11,
      endTimeNs: 19,
      startIndex: 2,
      endIndex: 2,
    });

    expect(analyzeMock).toHaveBeenCalledTimes(1);
    expect(analyzeMock.mock.calls[0][0]).toEqual([]); // empty slice
    expect(result.segments[0].analysis).toEqual(emptyAnalysis);
  });
});