// saccades/outputs/exportWriter/writeCaseBundle.test.ts

import { describe, expect, it } from 'vitest';
import path from 'node:path';

import { writeCaseBundle } from '@saccades/export/writeCaseBundle';
import { serializeCsvRows, serializeJsonValue } from '@saccades/export/serializers';

import type {
  CaseInfo,
  CaseOutputBundle,
  CaseOutputFileDescriptor,
  WriteCaseBundleOptions,
  ExportFileCategory,
  ExportFileFormat,
} from '@saccades/export/types';

describe('Export Writer Layer', () => {
  describe('A — Case Output Directory Resolution', () => {
    it('A1) — Uses explicit caseFolderName when provided', () => {
      // Create a bundle with minimal required fields.
      const bundle = makeBundle();
      // Create options
      const options = makeOptions({
        rootDir: '/exports',
        caseFolderName: 'manual-case-folder',
      });
      // Run the writeCaseBundle function with the bundle and options.
      const result = writeCaseBundle(bundle, options);
      // Assert that the caseFolderName in the result matches the explicitly provided name.
      expect(result.caseFolderName).toBe('manual-case-folder');
    });

    it('A2 — derives default caseFolderName from bundle.caseInfo.caseId', () => {
      const bundle = makeBundle({
        caseInfo: {
          caseId: 'Case-Alpha',
        },
      });

      const result = writeCaseBundle(bundle, makeOptions({ rootDir: '/exports' }));

      expect(result.caseFolderName).toBe('Case-Alpha');
    });

    it('A3 — resolves outputDir deterministically from rootDir and caseFolderName', () => {
      const bundle = makeBundle({
        caseInfo: {
          caseId: 'Case-Alpha',
        },
      });

      const result = writeCaseBundle(bundle, makeOptions({ rootDir: '/exports' }));

      expect(result.rootDir).toBe('/exports');
      expect(result.outputDir).toBe(path.join('/exports', 'Case-Alpha'));
    });
  });

  describe('B — CSV Serialization', () => {
    it('B1 — serializes per-saccade rows to CSV', () => {
      const rows = [
        {
          startTimeMs: 100,
          endTimeMs: 140,
          durationMs: 40,
          amplitudeDeg: 3.5,
        },
        {
          startTimeMs: 200,
          endTimeMs: 245,
          durationMs: 45,
          amplitudeDeg: 4.25,
        },
      ];

      const csv = serializeCsvRows(rows);

      expect(csv).toBe(
        [
          'amplitudeDeg,durationMs,endTimeMs,startTimeMs',
          '3.5,40,140,100',
          '4.25,45,245,200',
        ].join('\n')
      );
    });

    it('B2 — serializes session summary rows to CSV', () => {
      const rows = [
        {
          segmentId: 'session',
          count: 12,
          durationMs: 5000,
          ratePerSec: 2.4,
        },
      ];

      const csv = serializeCsvRows(rows);

      expect(csv).toBe(
        [
          'count,durationMs,ratePerSec,segmentId',
          '12,5000,2.4,session',
        ].join('\n')
      );
    });

    it('B3 — serializes histogram rows to CSV', () => {
      const rows = [
        { binStartMs: 0, binEndMs: 50, count: 2 },
        { binStartMs: 50, binEndMs: 100, count: 5 },
      ];

      const csv = serializeCsvRows(rows);

      expect(csv).toBe(
        [
          'binEndMs,binStartMs,count',
          '50,0,2',
          '100,50,5',
        ].join('\n')
      );
    });

    it('B4 — preserves deterministic column ordering across identical runs', () => {
      const rows = [
        { zeta: 1, alpha: 2, middle: 3 },
        { zeta: 4, alpha: 5, middle: 6 },
      ];

      const csv1 = serializeCsvRows(rows);
      const csv2 = serializeCsvRows(rows);

      expect(csv1).toBe(csv2);
      expect(csv1.split('\n')[0]).toBe('alpha,middle,zeta');
    });
  });

  describe('C — JSON Serialization', () => {
    it('C1 — serializes case-info metadata to JSON', () => {
      const value = {
        participantId: 'P-001',
        caseId: 'Case-Alpha',
        sessionLabel: 'Session 1',
        studyLabel: 'ADHD Pilot',
        generatedAtIso: '2026-03-16T12:00:00.000Z',
      };

      const json = serializeJsonValue(value);

      expect(json).toBe(
        [
          '{',
          '  "caseId": "Case-Alpha",',
          '  "generatedAtIso": "2026-03-16T12:00:00.000Z",',
          '  "participantId": "P-001",',
          '  "sessionLabel": "Session 1",',
          '  "studyLabel": "ADHD Pilot"',
          '}',
        ].join('\n')
      );
    });

    it('C2 — serializes run-config metadata to JSON', () => {
      const value = {
        detection: {
          velocityThresholdDegPerSec: 120,
        },
        metrics: {
          includeRatePerMin: true,
        },
      };

      const json = serializeJsonValue(value);

      expect(json).toBe(
        [
          '{',
          '  "detection": {',
          '    "velocityThresholdDegPerSec": 120',
          '  },',
          '  "metrics": {',
          '    "includeRatePerMin": true',
          '  }',
          '}',
        ].join('\n')
      );
    });

    it('C3 — serializes animation payload to JSON when present', () => {
      const value = {
        fps: 30,
        frames: [
          { tMs: 0, marker: 'start' },
          { tMs: 100, marker: 'cue' },
        ],
      };

      const json = serializeJsonValue(value);

      expect(json).toBe(
        [
          '{',
          '  "fps": 30,',
          '  "frames": [',
          '    {',
          '      "marker": "start",',
          '      "tMs": 0',
          '    },',
          '    {',
          '      "marker": "cue",',
          '      "tMs": 100',
          '    }',
          '  ]',
          '}',
        ].join('\n')
      );
    });
  });

  describe('D — PNG Placeholder Handling', () => {
    it('D1 — includes PNG artifacts in result', () => {
      const bundle = makeBundle();

      const result = writeCaseBundle(bundle, makeOptions());

      const pngArtifacts = result.artifacts.filter((a) => a.format === 'png');
      expect(pngArtifacts.length).toBeGreaterThan(0);
      expect(pngArtifacts.map((a) => a.key)).toContain('mainTimelinePng');
    });

    it('D2 — marks PNG artifacts as skipped placeholders', () => {
      const bundle = makeBundle();

      const result = writeCaseBundle(bundle, makeOptions());

      const pngArtifact = result.artifacts.find((a) => a.key === 'mainTimelinePng');

      expect(pngArtifact).toBeDefined();
      expect(pngArtifact?.skipped).toBe(true);
      expect(pngArtifact?.bytes).toBe(0);
    });

    it('D3 — preserves PNG relative paths from descriptors', () => {
      const bundle = makeBundle();

      const result = writeCaseBundle(bundle, makeOptions());

      const pngArtifact = result.artifacts.find((a) => a.key === 'mainTimelinePng');

      expect(pngArtifact?.relativePath).toBe('visuals/main-timeline.png');
    });
  });

  describe('E — Artifact Writing / Output Records', () => {
    it('E1 — returns one artifact result per descriptor considered', () => {
      const bundle = makeBundle();

      const result = writeCaseBundle(bundle, makeOptions());

      expect(result.artifacts).toHaveLength(bundle.files.length);
    });

    it('E2 — records absolutePath and relativePath for each artifact', () => {
      const bundle = makeBundle({
        caseInfo: {
          caseId: 'Case-Alpha',
        },
      });

      const result = writeCaseBundle(
        bundle,
        makeOptions({ rootDir: '/exports', caseFolderName: 'Case-Alpha' })
      );

      const artifact = result.artifacts.find((a) => a.key === 'caseInfoJson');

      expect(artifact?.relativePath).toBe('metadata/case-info.json');
      expect(artifact?.absolutePath).toBe(
        path.join('/exports', 'Case-Alpha', 'metadata/case-info.json')
      );
    });

    it('E3 — records bytes for written CSV/JSON artifacts', () => {
      const bundle = makeBundle();

      const result = writeCaseBundle(bundle, makeOptions());

      const caseInfoArtifact = result.artifacts.find((a) => a.key === 'caseInfoJson');
      const perSaccadeArtifact = result.artifacts.find((a) => a.key === 'perSaccadeCsv');

      expect(caseInfoArtifact?.bytes).toBeGreaterThan(0);
      expect(caseInfoArtifact?.skipped).toBe(false);

      expect(perSaccadeArtifact?.bytes).toBeGreaterThan(0);
      expect(perSaccadeArtifact?.skipped).toBe(false);
    });

    it('E4 — records skipped true for PNG placeholders', () => {
      const bundle = makeBundle();

      const result = writeCaseBundle(bundle, makeOptions());

      const pngArtifacts = result.artifacts.filter((a) => a.format === 'png');

      expect(pngArtifacts.length).toBeGreaterThan(0);
      expect(pngArtifacts.every((a) => a.skipped === true)).toBe(true);
    });
  });

  describe('F — Optional Artifact Handling', () => {
    it('F1 — handles missing optional animation descriptor cleanly', () => {
      const bundle = makeBundleWithoutAnimation();

      const result = writeCaseBundle(bundle, makeOptions());

      expect(result.artifacts.some((a) => a.category === 'animation')).toBe(false);
      expect(result.artifacts.length).toBe(bundle.files.length);
    });

    it('F2 — handles optional marker CSV when present', () => {
      const bundle = makeBundle({
        files: [
          ...baseFiles(),
          {
            key: 'markersCsv',
            relativePath: 'analysis/markers.csv',
            format: 'csv',
            category: 'analysis',
            optional: true,
            content: [
              { markerId: 'intro', timeMs: 0, label: 'Intro' },
              { markerId: 'task', timeMs: 1000, label: 'Task' },
            ],
          },
        ],
      });

      const result = writeCaseBundle(bundle, makeOptions());

      const markerArtifact = result.artifacts.find((a) => a.key === 'markersCsv');

      expect(markerArtifact).toBeDefined();
      expect(markerArtifact?.relativePath).toBe('analysis/markers.csv');
      expect(markerArtifact?.skipped).toBe(false);
      expect(markerArtifact?.bytes).toBeGreaterThan(0);
    });

    it('F3 — handles optional marker CSV absence without affecting other outputs', () => {
      const bundle = makeBundle();

      const result = writeCaseBundle(bundle, makeOptions());

      expect(result.artifacts.find((a) => a.key === 'markersCsv')).toBeUndefined();
      expect(result.artifacts.find((a) => a.key === 'caseInfoJson')).toBeDefined();
      expect(result.artifacts.find((a) => a.key === 'perSaccadeCsv')).toBeDefined();
    });
  });

  describe('G — Determinism + Safety', () => {
    it('G1 — identical bundle and options produce identical write results', () => {
      const bundle = makeBundle();
      const options = makeOptions({
        rootDir: '/exports',
        caseFolderName: 'Case-Alpha',
      });

      const result1 = writeCaseBundle(bundle, options);
      const result2 = writeCaseBundle(bundle, options);

      expect(result1).toEqual(result2);
    });

    it('G2 — bundle input is not mutated', () => {
      const bundle = makeBundle();
      const before = JSON.stringify(bundle);

      writeCaseBundle(bundle, makeOptions());

      expect(JSON.stringify(bundle)).toBe(before);
    });

    it('G3 — write result is fully serializable', () => {
      const bundle = makeBundle();

      const result = writeCaseBundle(bundle, makeOptions());

      expect(() => JSON.stringify(result)).not.toThrow();

      const roundTrip = JSON.parse(JSON.stringify(result));
      expect(roundTrip).toEqual(result);
    });
  });
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function makeOptions(
  overrides: Partial<WriteCaseBundleOptions> = {}
): WriteCaseBundleOptions {
  return {
    rootDir: '/tmp/exports',
    ...overrides,
  };
}

function makeBundle(
  overrides: Partial<CaseOutputBundle> & {
    caseInfo?: Partial<CaseInfo>;
    files?: CaseOutputFileDescriptor<unknown>[];
  } = {}
): CaseOutputBundle {
  const caseInfo: CaseInfo = {
    participantId: 'P-001',
    caseId: 'Case-Alpha',
    sessionLabel: 'Session 1',
    studyLabel: 'ADHD Pilot',
    generatedAtIso: '2026-03-16T12:00:00.000Z',
    ...overrides.caseInfo,
  };

  const bundle: CaseOutputBundle = {
    caseInfo,
    runConfig: {
      detection: {
        velocityThresholdDegPerSec: 120,
      },
      metrics: {
        includeRatePerMin: true,
      },
    },
    tables: {
      perSaccade: [
        { startTimeMs: 100, endTimeMs: 140, durationMs: 40, amplitudeDeg: 3.5 },
        { startTimeMs: 200, endTimeMs: 245, durationMs: 45, amplitudeDeg: 4.25 },
      ],
      sessionSummary: [
        { segmentId: 'session', count: 2, durationMs: 145, ratePerSec: 13.7931034483 },
      ],
      isiHistogram: [
        { binStartMs: 0, binEndMs: 50, count: 1 },
        { binStartMs: 50, binEndMs: 100, count: 0 },
      ],
    },
    visuals: {
      mainTimeline: {
        kind: 'timeline-model',
      },
    },
    animation: {
      fps: 30,
      frames: [
        { tMs: 0, marker: 'start' },
        { tMs: 100, marker: 'cue' },
      ],
    },
    files: overrides.files ?? baseFiles(),
  };

  return {
    ...bundle,
    ...overrides,
    caseInfo,
    files: overrides.files ?? bundle.files,
  };
}

function makeBundleWithoutAnimation(): CaseOutputBundle {
  return makeBundle({
    animation: undefined,
    files: baseFiles().filter((file) => file.category !== 'animation'),
  });
}

function baseFiles(): CaseOutputFileDescriptor<unknown>[] {
  return [
    {
      key: 'caseInfoJson',
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
      key: 'runConfigJson',
      relativePath: 'metadata/run-config.json',
      format: 'json',
      category: 'metadata',
      optional: false,
      content: {
        detection: {
          velocityThresholdDegPerSec: 120,
        },
        metrics: {
          includeRatePerMin: true,
        },
      },
    },
    {
      key: 'perSaccadeCsv',
      relativePath: 'analysis/per-saccade.csv',
      format: 'csv',
      category: 'analysis',
      optional: false,
      content: [
        { startTimeMs: 100, endTimeMs: 140, durationMs: 40, amplitudeDeg: 3.5 },
        { startTimeMs: 200, endTimeMs: 245, durationMs: 45, amplitudeDeg: 4.25 },
      ],
    },
    {
      key: 'sessionSummaryCsv',
      relativePath: 'analysis/session-summary.csv',
      format: 'csv',
      category: 'analysis',
      optional: false,
      content: [
        { segmentId: 'session', count: 2, durationMs: 145, ratePerSec: 13.7931034483 },
      ],
    },
    {
      key: 'isiHistogramCsv',
      relativePath: 'analysis/isi-histogram.csv',
      format: 'csv',
      category: 'analysis',
      optional: false,
      content: [
        { binStartMs: 0, binEndMs: 50, count: 1 },
        { binStartMs: 50, binEndMs: 100, count: 0 },
      ],
    },
    {
      key: 'mainTimelinePng',
      relativePath: 'visuals/main-timeline.png',
      format: 'png',
      category: 'visuals',
      optional: false,
      content: {
        kind: 'timeline-model',
        width: 1600,
        height: 900,
      },
    },
    {
      key: 'animationJson',
      relativePath: 'animation/playback.json',
      format: 'json',
      category: 'animation',
      optional: true,
      content: {
        fps: 30,
        frames: [
          { tMs: 0, marker: 'start' },
          { tMs: 100, marker: 'cue' },
        ],
      },
    },
  ];
}