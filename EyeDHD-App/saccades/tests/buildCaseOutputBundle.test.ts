import { describe, it, expect } from 'vitest';
import { buildCaseOutputBundle } from '../outputs/caseBundle/buildCaseOutputBundle';
import type {
  CaseOutputBundleInput,
  BuildCaseOutputBundleOptions,
} from '../outputs/caseBundle/types';

function makeInput(
    overrides: Partial<CaseOutputBundleInput> = {}
): CaseOutputBundleInput {
    return {
        metadata: {
            participantId: 'P-001',
            caseId: 'Case-Alpha',
            sessionLabel: 'Session 1',
            studyLabel: 'ADHD Pilot',
            sourceFileName: 'participant-001.csv',
        },
        runConfig: {
            detection: { velocityThresholdDegPerSec: 180 },
            metrics: { minAmplitudeDeg: 0.5 },
            visualization: { binWidthMs: 100 },
        },
        analysis: {
            perSaccade: [
                { timeMs: 100, amplitudeDeg: 2.5, durationMs: 40 },
                { timeMs: 240, amplitudeDeg: 1.25, durationMs: 32 },
                ],
            sessionSummary: {
                totalSaccades: 2,
                ratePerSec: 0.8,
            },
            segmentSummaries: [
                { segmentId: 'baseline', saccadeCount: 1, ratePerSec: 0.5 },
                { segmentId: 'task', saccadeCount: 1, ratePerSec: 1.1 },
            ],
            isiValuesMs: [140],
            diagnostics: {
                filteredCounts: {
                    amplitudeTooSmall: 1,
                },
            },
        },
        visualization: {
            scatter: {
                points: [
                    { timeMs: 100, amplitudeDeg: 2.5 },
                    { timeMs: 240, amplitudeDeg: 1.25 },
                ],
            },
            rateSeries: {
                binWidthMs: 100,
                points: [
                    { timeMs: 0, ratePerSec: 0.5 },
                    { timeMs: 100, ratePerSec: 1.0 },
                ],
            },
            isiHistogram: {
                binWidthMs: 50,
                binEdges: [0, 50, 100, 150, 200],
                counts: [0, 0, 1, 0],
            },
            markers: [
                { timeMs: 120, label: 'Distractor A', kind: 'distractor' },
                { timeMs: 300, label: 'Segment End', kind: 'boundary' },
            ],
        },
        animation: {
            frames: [
                { timeMs: 0, x: 0.1, y: 0.2 },
                { timeMs: 10, x: 0.2, y: 0.25 },
            ],
        },
        ...overrides,
    };
}

function makeOptions(
    overrides: Partial<BuildCaseOutputBundleOptions> = {}
): BuildCaseOutputBundleOptions {
    return {
        generatedAtIso: '2026-03-16T12:00:00.000Z',
        ...overrides,
    };
}

describe('Case Output Bundle', () => {
    describe('A — Metadata + Case Identity', () => {
        it('A1) — Builds caseInfo from metadata input', () => {
            // Create input object
            const input = makeInput();
            // Call the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that caseInfo is correctly constructed
            expect(result.caseInfo).toEqual({
                participantId: 'P-001',
                caseId: 'Case-Alpha',
                sessionLabel: 'Session 1',
                studyLabel: 'ADHD Pilot',
                generatedAtIso: '2026-03-16T12:00:00.000Z',
            });
        });

        it('A2) — Injects deterministic timestamp when provided in options', () => {
            //  Create input object
            const input = makeInput();
            // Call the function with overridden generatedAtIso
            const options = makeOptions({
                generatedAtIso: '2030-01-01T00:00:00.000Z',
            });
            // Run the function under test
            const result = buildCaseOutputBundle(input, options);
            // Assert that the generatedAtIso in caseInfo matches the overridden value
            expect(result.caseInfo.generatedAtIso).toBe('2030-01-01T00:00:00.000Z');
        });

        it('A3) — Generates fallback caseId when missing', () => {
            // Create input object with missing caseId  
            const input = makeInput({
                metadata: {
                    participantId: 'P-001',
                    sessionLabel: 'Session 1',
                    studyLabel: 'ADHD Pilot',
                    sourceFileName: 'participant-001.csv',
                },
            });
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that caseId falls back to 'case-unknown'
            expect(result.caseInfo.caseId).toBe('case-unknown');
        });
    });

    describe('B — Table Construction', () => {
        it('B1) — Converts per-saccade analysis into perSaccadeRows', () => {
            // Create input object with per-saccade analysis data
            const input = makeInput();
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that perSaccadeRows are correctly constructed from input analysis
            expect(result.tables.perSaccadeRows).toEqual([
                { timeMs: 100, amplitudeDeg: 2.5, durationMs: 40 },
                { timeMs: 240, amplitudeDeg: 1.25, durationMs: 32 },
            ]);
        });

        it('B2) — Converts session summary into sessionSummaryRows', () => {
            // Create input object with session summary data
            const input = makeInput();
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that sessionSummaryRows contains the session summary data
            expect(result.tables.sessionSummaryRows).toEqual([
                {
                    totalSaccades: 2,
                    ratePerSec: 0.8,
                },
            ]);
        });

        it('B3) — Converts segment summaries into segmentSummaryRows', () => {
            // Create input object with segment summaries
            const input = makeInput();
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that segmentSummaryRows contains the segment summaries
            expect(result.tables.segmentSummaryRows).toEqual([
                { segmentId: 'baseline', saccadeCount: 1, ratePerSec: 0.5 },
                { segmentId: 'task', saccadeCount: 1, ratePerSec: 1.1 },
            ]);
        });

        it('B4) — Converts ISI histogram into isiHistogramRows', () => {
            // Create input object with ISI histogram data
            const input = makeInput();
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that isiHistogramRows contains the ISI histogram data
            expect(result.tables.isiHistogramRows).toEqual([
                { binStartMs: 0, binEndMs: 50, count: 0 },
                { binStartMs: 50, binEndMs: 100, count: 0 },
                { binStartMs: 100, binEndMs: 150, count: 1 },
                { binStartMs: 150, binEndMs: 200, count: 0 },
            ]);
        });
    });

    describe('C — Visualization Models', () => {
        it('C1) — Preserves scatter model', () => {
            // Create input object with scatter visualization data
            const input = makeInput();
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that scatterModel in visuals matches the input scatter data
            expect(result.visuals.scatterModel).toEqual({
                points: [
                    { timeMs: 100, amplitudeDeg: 2.5 },
                    { timeMs: 240, amplitudeDeg: 1.25 },
                ],
            });
        });

        it('C2) — Preserves rate series model', () => {
            // Create input object with rate series visualization data
            const input = makeInput();
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that rateSeriesModel in visuals matches the input rate series data
            expect(result.visuals.rateSeriesModel).toEqual({
                binWidthMs: 100,
                points: [
                    { timeMs: 0, ratePerSec: 0.5 },
                    { timeMs: 100, ratePerSec: 1.0 },
                ],
            });
        });

        it('C3) — Preserves histogram model', () => {
            // Create input object with ISI histogram visualization data
            const input = makeInput();
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that isiHistogramModel in visuals matches the input ISI histogram data
            expect(result.visuals.isiHistogramModel).toEqual({
                binWidthMs: 50,
                binEdges: [0, 50, 100, 150, 200],
                counts: [0, 0, 1, 0],
            });
        });

        it('C4) — Attaches overlay markers', () => {
            // Create input object with markers in visualization data
            const input = makeInput();
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that overlaysModel in visuals contains the markers from input
            expect(result.visuals.overlaysModel).toEqual({
                markers: [
                    { timeMs: 120, label: 'Distractor A', kind: 'distractor' },
                    { timeMs: 300, label: 'Segment End', kind: 'boundary' },
                ],
            });
        });
    });

    describe('D — File Descriptor Generation', () => {
        it('D1) — Generates metadata descriptors', () => {
            // Create input object
            const input = makeInput();
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            //  Assert that files array contains descriptors for caseInfo and runConfig with correct content
            expect(result.files).toEqual(
                expect.arrayContaining([
                    {
                        key: 'caseInfo',
                        relativePath: 'metadata/case-info.json',
                        format: 'json',
                        category: 'metadata',
                        optional: false,
                        content: {
                            participantId: 'P-001',
                            caseId: 'Case-Alpha',
                            sessionLabel: 'Session 1',
                            studyLabel: 'ADHD Pilot',
                            generatedAtIso: '2026-03-16T12:00:00.000Z',
                        },
                    },
                    {
                        key: 'runConfig',
                        relativePath: 'metadata/run-config.json',
                        format: 'json',
                        category: 'metadata',
                        optional: false,
                        content: {
                            detection: { velocityThresholdDegPerSec: 180 },
                            metrics: { minAmplitudeDeg: 0.5 },
                            visualization: { binWidthMs: 100 },
                        },
                    },
                ])
            );
        });

        it('D2) — Generates analysis CSV descriptors', () => {
            // Create input object
            const input = makeInput();
            // Run the function under test
            const result = buildCaseOutputBundle(input, makeOptions());
            // Assert that files array contains CSV descriptors for per-saccade, session summary, segment summary, and ISI histogram with correct content
            expect(result.files).toEqual(
                expect.arrayContaining([
                    {
                        key: 'perSaccadeCsv',
                        relativePath: 'analysis/per-saccade.csv',
                        format: 'csv',
                        category: 'analysis',
                        optional: false,
                        content: [
                            { timeMs: 100, amplitudeDeg: 2.5, durationMs: 40 },
                            { timeMs: 240, amplitudeDeg: 1.25, durationMs: 32 },
                        ],
                    },
                    {
                        key: 'sessionSummaryCsv',
                        relativePath: 'analysis/session-summary.csv',
                        format: 'csv',
                        category: 'analysis',
                        optional: false,
                        content: [
                            {
                                totalSaccades: 2,
                                ratePerSec: 0.8,
                            },
                        ],
                    },
                    {
                        key: 'segmentSummaryCsv',
                        relativePath: 'analysis/segment-summary.csv',
                        format: 'csv',
                        category: 'analysis',
                        optional: true,
                        content: [
                            { segmentId: 'baseline', saccadeCount: 1, ratePerSec: 0.5 },
                            { segmentId: 'task', saccadeCount: 1, ratePerSec: 1.1 },
                        ],
                    },
                    {
                        key: 'isiHistogramCsv',
                        relativePath: 'analysis/isi-histogram.csv',
                        format: 'csv',
                        category: 'analysis',
                        optional: false,
                        content: [
                            { binStartMs: 0, binEndMs: 50, count: 0 },
                            { binStartMs: 50, binEndMs: 100, count: 0 },
                            { binStartMs: 100, binEndMs: 150, count: 1 },
                            { binStartMs: 150, binEndMs: 200, count: 0 },
                        ],
                    },
                ])
            );
        });

        it('D3 — generates visualization CSV descriptors', () => {
            const input = makeInput();

            const result = buildCaseOutputBundle(input, makeOptions());

            expect(result.files).toEqual(
                expect.arrayContaining([
                    {
                        key: 'scatterModelCsv',
                        relativePath: 'visuals/scatter-model.csv',
                        format: 'csv',
                        category: 'visuals',
                        optional: false,
                        content: [
                            { timeMs: 100, amplitudeDeg: 2.5 },
                            { timeMs: 240, amplitudeDeg: 1.25 },
                        ],
                    },
                    {
                        key: 'rateSeriesModelCsv',
                        relativePath: 'visuals/rate-series-model.csv',
                        format: 'csv',
                        category: 'visuals',
                        optional: false,
                        content: [
                            { timeMs: 0, ratePerSec: 0.5 },
                            { timeMs: 100, ratePerSec: 1.0 },
                        ],
                    },
                    {
                        key: 'isiHistogramModelCsv',
                        relativePath: 'visuals/isi-histogram-model.csv',
                        format: 'csv',
                        category: 'visuals',
                        optional: false,
                        content: [
                            { binStartMs: 0, binEndMs: 50, count: 0 },
                            { binStartMs: 50, binEndMs: 100, count: 0 },
                            { binStartMs: 100, binEndMs: 150, count: 1 },
                            { binStartMs: 150, binEndMs: 200, count: 0 },
                        ],
                    },
                    {
                        key: 'overlaysModelCsv',
                        relativePath: 'visuals/overlays-model.csv',
                        format: 'csv',
                        category: 'visuals',
                        optional: true,
                        content: [
                            { timeMs: 120, label: 'Distractor A', kind: 'distractor' },
                            { timeMs: 300, label: 'Segment End', kind: 'boundary' },
                        ],
                    },
                ])
            );
        });

        it('D4 — generates PNG placeholder descriptors', () => {
            const input = makeInput();

            const result = buildCaseOutputBundle(input, makeOptions());

            expect(result.files).toEqual(
                expect.arrayContaining([
                    {
                        key: 'scatterPng',
                        relativePath: 'visuals/scatter.png',
                        format: 'png',
                        category: 'visuals',
                        optional: false,
                        content: null,
                    },
                    {
                        key: 'rateSeriesPng',
                        relativePath: 'visuals/rate-series.png',
                        format: 'png',
                        category: 'visuals',
                        optional: false,
                        content: null,
                    },
                    {
                        key: 'isiHistogramPng',
                        relativePath: 'visuals/isi-histogram.png',
                        format: 'png',
                        category: 'visuals',
                        optional: false,
                        content: null,
                    },
                ])
            );
        });
    });

    describe('E — Optional Artifact Handling', () => {
        it('E1 — markers CSV only generated if markers exist', () => {
            const inputWithoutMarkers = makeInput({
                visualization: {
                scatter: {
                    points: [
                    { timeMs: 100, amplitudeDeg: 2.5 },
                    { timeMs: 240, amplitudeDeg: 1.25 },
                    ],
                },
                rateSeries: {
                    binWidthMs: 100,
                    points: [
                    { timeMs: 0, ratePerSec: 0.5 },
                    { timeMs: 100, ratePerSec: 1.0 },
                    ],
                },
                isiHistogram: {
                    binWidthMs: 50,
                    binEdges: [0, 50, 100, 150, 200],
                    counts: [0, 0, 1, 0],
                },
                markers: [],
                },
            });

            const result = buildCaseOutputBundle(inputWithoutMarkers, makeOptions());

            expect(result.tables.markerRows).toEqual([]);
            expect(result.files.some((file) => file.key === 'markersCsv')).toBe(false);
            expect(result.files.some((file) => file.key === 'overlaysModelCsv')).toBe(false);
        });

        it('E2 — segment summaries CSV only generated if segments exist', () => {
            const inputWithoutSegments = makeInput({
                analysis: {
                    perSaccade: [
                        { timeMs: 100, amplitudeDeg: 2.5, durationMs: 40 },
                        { timeMs: 240, amplitudeDeg: 1.25, durationMs: 32 },
                    ],
                    sessionSummary: {
                        totalSaccades: 2,
                        ratePerSec: 0.8,
                    },
                    segmentSummaries: [],
                    isiValuesMs: [140],
                    diagnostics: {
                        filteredCounts: {
                        amplitudeTooSmall: 1,
                        },
                    },
                },
            });

            const result = buildCaseOutputBundle(inputWithoutSegments, makeOptions());

            expect(result.tables.segmentSummaryRows).toEqual([]);
            expect(result.files.some((file) => file.key === 'segmentSummaryCsv')).toBe(false);
        });

        it('E3 — animation descriptor only generated if animation exists', () => {
            const inputWithoutAnimation = makeInput({
                animation: undefined,
            });

            const result = buildCaseOutputBundle(inputWithoutAnimation, makeOptions());

            expect(result.animation).toBeUndefined();
            expect(result.files.some((file) => file.key === 'eyeAnimationDataJson')).toBe(false);
        });
    });

    describe('F — Determinism + Safety', () => {
        it('F1 — bundle output deterministic for identical input', () => {
            const input = makeInput();
            const options = makeOptions();

            const resultA = buildCaseOutputBundle(input, options);
            const resultB = buildCaseOutputBundle(input, options);

            expect(resultA).toEqual(resultB);
        });

        it('F2 — input objects not mutated', () => {
            const input = makeInput();
            const before = structuredClone(input);

            buildCaseOutputBundle(input, makeOptions());

            expect(input).toEqual(before);
        });

        it('F3 — bundle output fully serializable', () => {
            const input = makeInput();

            const result = buildCaseOutputBundle(input, makeOptions());

            const json = JSON.stringify(result);
            const parsed = JSON.parse(json);

            expect(parsed).toEqual(result);
        });
    });
});