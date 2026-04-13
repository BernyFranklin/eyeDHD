// saccades/outputs/exportWriter/writeCaseBundle.test.ts

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { writeCaseBundle } from '@saccades/export/writeCaseBundle';
import { serializeCsvRows, serializeJsonValue } from '@saccades/export/serializers';
import { buildScatterFigureSpec } from '@saccades/visualization/render';
import type { PngFigureRenderBackend } from '@saccades/visualization/render/backends/types';

import type {
	CaseInfo,
	CaseOutputBundle,
	CaseOutputFileDescriptor,
	CaseOutputTables,
	CaseOutputVisualModels,
	WriteCaseBundleOptions,
	ExportFileCategory,
	ExportFileFormat
} from '@saccades/export/types';

describe('Export Writer Layer', () => {
	describe('A — Case Output Directory Resolution', () => {
		it('A1) — Uses explicit caseFolderName when provided', () => {
			const bundle = makeBundle();
			const options = makeOptions({
				caseFolderName: 'manual-case-folder'
			});
			const result = writeCaseBundle(bundle, options);
			expect(result.caseFolderName).toBe('manual-case-folder');
		});

		it('A2) — Derives default caseFolderName from bundle.caseInfo.caseId', () => {
			const bundle = makeBundle({
				caseInfo: {
					caseId: 'Case-Alpha'
				}
			});
			const result = writeCaseBundle(bundle, makeOptions());
			expect(result.caseFolderName).toBe('Case-Alpha');
		});

		it('A3) — Resolves outputDir deterministically from rootDir and caseFolderName', () => {
			const rootDir = makeTempDir();
			const bundle = makeBundle({
				caseInfo: {
					caseId: 'Case-Alpha'
				}
			});
			const result = writeCaseBundle(bundle, makeOptions({ rootDir }));
			expect(result.rootDir).toBe(rootDir);
			expect(result.outputDir).toBe(path.join(rootDir, 'Case-Alpha'));
		});
	});

	describe('B — CSV Serialization', () => {
		it('B1) — Serializes per-saccade rows to CSV', () => {
			// Create sample per-saccade rows to test CSV serialization.
			const rows = [
				{
					startTimeMs: 100,
					endTimeMs: 140,
					durationMs: 40,
					amplitudeDeg: 3.5
				},
				{
					startTimeMs: 200,
					endTimeMs: 245,
					durationMs: 45,
					amplitudeDeg: 4.25
				}
			];
			// Serialize the rows to CSV using the serializer function.
			const csv = serializeCsvRows(rows);
			// Assert that the resulting CSV string matches the expected format and content.
			expect(csv).toBe(
				[
					'amplitudeDeg,durationMs,endTimeMs,startTimeMs',
					'3.5,40,140,100',
					'4.25,45,245,200'
				].join('\n')
			);
		});

		it('B2) — Serializes session summary rows to CSV', () => {
			// Create sample session summary rows to test CSV serialization.
			const rows = [
				{
					segmentId: 'session',
					count: 12,
					durationMs: 5000,
					ratePerSec: 2.4
				}
			];
			// Serialize the rows to CSV using the serializer function.
			const csv = serializeCsvRows(rows);
			// Assert that the resulting CSV string matches the expected format and content.
			expect(csv).toBe(
				['count,durationMs,ratePerSec,segmentId', '12,5000,2.4,session'].join('\n')
			);
		});

		it('B3) — Serializes histogram rows to CSV', () => {
			// Create sample histogram rows to test CSV serialization.
			const rows = [
				{ binStartMs: 0, binEndMs: 50, count: 2 },
				{ binStartMs: 50, binEndMs: 100, count: 5 }
			];
			// Serialize the rows to CSV using the serializer function.
			const csv = serializeCsvRows(rows);
			// Assert that the resulting CSV string matches the expected format and content.
			expect(csv).toBe(['binEndMs,binStartMs,count', '50,0,2', '100,50,5'].join('\n'));
		});

		it('B4) — Preserves deterministic column ordering across identical runs', () => {
			// Create sample rows with multiple columns to test deterministic column ordering.
			const rows = [
				{ zeta: 1, alpha: 2, middle: 3 },
				{ zeta: 4, alpha: 5, middle: 6 }
			];
			// Serialize the rows to CSV multiple times to check for consistent column ordering.
			const csv1 = serializeCsvRows(rows);
			const csv2 = serializeCsvRows(rows);
			// Assert that the resulting CSV strings are identical and that the column order is consistent.
			expect(csv1).toBe(csv2);
			expect(csv1.split('\n')[0]).toBe('alpha,middle,zeta');
		});
	});

	describe('C — JSON Serialization', () => {
		it('C1) — Serializes case-info metadata to JSON', () => {
			// Create a sample case-info metadata object to test JSON serialization.
			const value = {
				participantId: 'P-001',
				caseId: 'Case-Alpha',
				sessionLabel: 'Session 1',
				studyLabel: 'ADHD Pilot',
				generatedAtIso: '2026-03-16T12:00:00.000Z'
			};
			// Serialize the sample case-info metadata object to JSON using the serializer function.
			const json = serializeJsonValue(value);
			// Assert that the resulting JSON string matches the expected format and content.
			expect(json).toBe(
				[
					'{',
					'  "caseId": "Case-Alpha",',
					'  "generatedAtIso": "2026-03-16T12:00:00.000Z",',
					'  "participantId": "P-001",',
					'  "sessionLabel": "Session 1",',
					'  "studyLabel": "ADHD Pilot"',
					'}'
				].join('\n')
			);
		});

		it('C2) — Serializes run-config metadata to JSON', () => {
			// Create values to test JSON serialization of run-config metadata.
			const value = {
				detection: {
					velocityThresholdDegPerSec: 120
				},
				metrics: {
					includeRatePerMin: true
				}
			};
			// Serialize the run-config metadata object to JSON using the serializer function.
			const json = serializeJsonValue(value);
			// Assert that the resulting JSON string matches the expected format and content.
			expect(json).toBe(
				[
					'{',
					'  "detection": {',
					'    "velocityThresholdDegPerSec": 120',
					'  },',
					'  "metrics": {',
					'    "includeRatePerMin": true',
					'  }',
					'}'
				].join('\n')
			);
		});

		it('C3) — Serializes animation payload to JSON when present', () => {
			// Create a sample animation payload object to test JSON serialization.
			const value = {
				fps: 30,
				frames: [
					{ tMs: 0, marker: 'start' },
					{ tMs: 100, marker: 'cue' }
				]
			};
			// Serialize the sample animation payload object to JSON using the serializer function.
			const json = serializeJsonValue(value);
			// Assert that the resulting JSON string matches the expected format and content.
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
					'}'
				].join('\n')
			);
		});
	});

	describe('D — PNG Artifact Handling', () => {
		it('D1) — Includes PNG artifacts in result', () => {
			const bundle = makeBundle();
			const result = writeCaseBundle(bundle, makeOptions());
			const pngArtifacts = result.artifacts.filter((a) => a.format === 'png');
			expect(pngArtifacts.length).toBeGreaterThan(0);
			expect(pngArtifacts.map((a) => a.key)).toContain('mainTimelinePng');
		});

		it('D2) — Renders PNG artifacts with bytes via the injected backend', () => {
			const bundle = makeBundle();
			const result = writeCaseBundle(bundle, makeOptions());
			const pngArtifact = result.artifacts.find((a) => a.key === 'mainTimelinePng');
			expect(pngArtifact).toBeDefined();
			expect(pngArtifact?.skipped).toBe(false);
			expect(pngArtifact?.bytes).toBeGreaterThan(0);
		});

		it('D3) — Preserves PNG relative paths from descriptors', () => {
			const bundle = makeBundle();
			const result = writeCaseBundle(bundle, makeOptions());
			const pngArtifact = result.artifacts.find((a) => a.key === 'mainTimelinePng');
			expect(pngArtifact?.relativePath).toBe('visuals/main-timeline.png');
		});
	});

	describe('E — Artifact Writing / Output Records', () => {
		it('E1) — Returns one artifact result per descriptor considered', () => {
			// Create a bundle with a set of file descriptors to test that each descriptor results in one artifact in the output.
			const bundle = makeBundle();
			// Write the bundle using the writeCaseBundle function with default options.
			const result = writeCaseBundle(bundle, makeOptions());
			// Assert that the number of artifacts returned matches the number of file descriptors in the bundle.
			expect(result.artifacts).toHaveLength(bundle.files.length);
		});

		it('E2) — Records absolutePath and relativePath for each artifact', () => {
			const rootDir = makeTempDir();
			const bundle = makeBundle({
				caseInfo: {
					caseId: 'Case-Alpha'
				}
			});
			const result = writeCaseBundle(
				bundle,
				makeOptions({ rootDir, caseFolderName: 'Case-Alpha' })
			);
			const artifact = result.artifacts.find((a) => a.key === 'caseInfoJson');
			expect(artifact?.relativePath).toBe('metadata/case-info.json');
			expect(artifact?.absolutePath).toBe(
				path.join(rootDir, 'Case-Alpha', 'metadata/case-info.json')
			);
		});

		it('E3) — Records bytes for written CSV/JSON artifacts', () => {
			// Create a bundle to test that the bytes field is recorded correctly for CSV and JSON artifacts.
			const bundle = makeBundle();
			// Write the bundle using the writeCaseBundle function with default options.
			const result = writeCaseBundle(bundle, makeOptions());
			// Find the artifacts corresponding to the case info JSON and per-saccade CSV files in the resulting artifacts list.
			const caseInfoArtifact = result.artifacts.find((a) => a.key === 'caseInfoJson');
			const perSaccadeArtifact = result.artifacts.find((a) => a.key === 'perSaccadeCsv');
			// Assert that the bytes field is greater than zero and that skipped is false for both JSON and CSV artifacts.
			expect(caseInfoArtifact?.bytes).toBeGreaterThan(0);
			expect(caseInfoArtifact?.skipped).toBe(false);
			// Assert that the bytes field is greater than zero and that skipped is false for the per-saccade CSV artifact.
			expect(perSaccadeArtifact?.bytes).toBeGreaterThan(0);
			expect(perSaccadeArtifact?.skipped).toBe(false);
		});

		it('E4) — Records skipped false for rendered PNG artifacts', () => {
			const bundle = makeBundle();
			const result = writeCaseBundle(bundle, makeOptions());
			const pngArtifacts = result.artifacts.filter((a) => a.format === 'png');
			expect(pngArtifacts.length).toBeGreaterThan(0);
			expect(pngArtifacts.every((a) => a.skipped === false)).toBe(true);
		});
	});

	describe('F — Optional Artifact Handling', () => {
		it('F1) — Handles missing optional animation descriptor cleanly', () => {
			// Create a bundle without the optional animation descriptor to test that missing optional artifacts are handled cleanly.
			const bundle = makeBundleWithoutAnimation();
			// Write the bundle using the writeCaseBundle function with default options.
			const result = writeCaseBundle(bundle, makeOptions());
			// Assert that no artifacts in the resulting artifacts list have the category 'animation' and that the number of artifacts matches the number of file descriptors in the bundle.
			expect(result.artifacts.some((a) => a.category === 'animation')).toBe(false);
			expect(result.artifacts.length).toBe(bundle.files.length);
		});

		it('F2) — Handles optional marker CSV when present', () => {
			// Create a bundle with the optional marker CSV file included to test that optional artifacts are handled correctly when present.
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
							{ markerId: 'task', timeMs: 1000, label: 'Task' }
						]
					}
				]
			});
			// Write the bundle using the writeCaseBundle function with default options.
			const result = writeCaseBundle(bundle, makeOptions());
			// Find the artifact corresponding to the optional marker CSV file in the resulting artifacts list.
			const markerArtifact = result.artifacts.find((a) => a.key === 'markersCsv');
			// Assert that the optional marker CSV artifact is defined and has the expected properties.
			expect(markerArtifact).toBeDefined();
			expect(markerArtifact?.relativePath).toBe('analysis/markers.csv');
			expect(markerArtifact?.skipped).toBe(false);
			expect(markerArtifact?.bytes).toBeGreaterThan(0);
		});

		it('F3) — Handles optional marker CSV absence without affecting other outputs', () => {
			// Create a bundle without the optional marker CSV file to test that its absence does not affect other outputs.
			const bundle = makeBundle();
			// Write the bundle using the writeCaseBundle function with default options.
			const result = writeCaseBundle(bundle, makeOptions());
			// Assert that the optional marker CSV artifact is not present and that other expected artifacts are still present in the resulting artifacts list.
			expect(result.artifacts.find((a) => a.key === 'markersCsv')).toBeUndefined();
			expect(result.artifacts.find((a) => a.key === 'caseInfoJson')).toBeDefined();
			expect(result.artifacts.find((a) => a.key === 'perSaccadeCsv')).toBeDefined();
		});
	});

	describe('G — Determinism + Safety', () => {
		it('G1) — Identical bundle and options produce identical write results', () => {
			const rootDir = makeTempDir();
			const bundle = makeBundle();
			const options = makeOptions({
				rootDir,
				caseFolderName: 'Case-Alpha'
			});
			const result1 = writeCaseBundle(bundle, options);
			const result2 = writeCaseBundle(bundle, options);
			expect(result1).toEqual(result2);
		});

		it('G2) — Bundle input is not mutated', () => {
			// Create a bundle and capture its serialized form before calling writeCaseBundle to verify that the input bundle is not mutated by the function.
			const bundle = makeBundle();
			// Snapshot of the bundle before calling writeCaseBundle.
			const before = JSON.stringify(bundle);
			// Call writeCaseBundle with the bundle and options.
			writeCaseBundle(bundle, makeOptions());
			// Compare snapshot and bundle after calling writeCaseBundle to ensure that the input bundle has not been mutated.
			expect(JSON.stringify(bundle)).toBe(before);
		});

		it('G3) — Write result is fully serializable', () => {
			// Create a bundle to test that the result of writeCaseBundle is fully serializable to JSON.
			const bundle = makeBundle();
			// Call writeCaseBundle with the bundle and options to get the result that will be tested for JSON serializability.
			const result = writeCaseBundle(bundle, makeOptions());
			// Assert that JSON.stringify does not throw when serializing the result.
			expect(() => JSON.stringify(result)).not.toThrow();
			// Assert that parsing the serialized result produces an object equal to the original result.
			const roundTrip = JSON.parse(JSON.stringify(result));
			expect(roundTrip).toEqual(result);
		});
	});
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function makeTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'saccades-writer-'));
}

function makeTestPngBackend(): PngFigureRenderBackend {
	return {
		kind: 'test-png-backend',
		supportedFormats: ['png'],
		renderFigure(spec, context) {
			return {
				figureId: spec.figureId,
				format: 'png',
				mimeType: 'image/png',
				widthPx: context.widthPx,
				heightPx: context.heightPx,
				dpi: context.dpi,
				data: Uint8Array.from([1, 2, 3, 4])
			};
		}
	};
}

function makeOptions(
	overrides: Partial<WriteCaseBundleOptions> = {}
): WriteCaseBundleOptions {
	return {
		rootDir: makeTempDir(),
		png: {
			backend: makeTestPngBackend(),
			dpi: 300,
			background: 'white'
		},
		...overrides
	};
}

function makeBundle(
	overrides: Partial<
		Omit<CaseOutputBundle, 'caseInfo' | 'files' | 'tables' | 'visuals' | 'animation'>
	> & {
		caseInfo?: Partial<CaseInfo>;
		files?: CaseOutputFileDescriptor<unknown>[];
		tables?: Partial<CaseOutputTables>;
		visuals?: Partial<CaseOutputVisualModels>;
		animation?: CaseOutputBundle['animation'];
	} = {}
): CaseOutputBundle {
	const caseInfo: CaseInfo = {
		participantId: 'P-001',
		caseId: 'Case-Alpha',
		sessionLabel: 'Session 1',
		studyLabel: 'ADHD Pilot',
		generatedAtIso: '2026-03-16T12:00:00.000Z',
		...(overrides.caseInfo ?? {})
	};

	const tables: CaseOutputTables = {
		perSaccadeRows: [
			{ timeMs: 100, amplitudeDeg: 3.5, durationMs: 40 },
			{ timeMs: 200, amplitudeDeg: 4.25, durationMs: 45 }
		],
		sessionSummaryRows: [
			{ segmentId: 'session', count: 2, durationMs: 145, ratePerSec: 13.7931034483 }
		],
		segmentSummaryRows: [
			{ segmentId: 'session', saccadeCount: 2, ratePerSec: 13.7931034483 }
		],
		isiHistogramRows: [
			{ binStartMs: 0, binEndMs: 50, count: 1 },
			{ binStartMs: 50, binEndMs: 100, count: 0 }
		],
		markerRows: [
			{ timeMs: 0, label: 'Intro', kind: 'segment-start' },
			{ timeMs: 1000, label: 'Task', kind: 'segment-start' }
		],
		...(overrides.tables ?? {})
	};

	const visuals: CaseOutputVisualModels = {
		scatterModel: {
			points: [
				{ timeMs: 100, amplitudeDeg: 3.5 },
				{ timeMs: 200, amplitudeDeg: 4.25 }
			]
		},
		rateSeriesModel: {
			binWidthMs: 100,
			points: [
				{ timeMs: 0, ratePerSec: 0 },
				{ timeMs: 100, ratePerSec: 13.7931034483 }
			]
		},
		isiHistogramModel: {
			binWidthMs: 50,
			binEdges: [0, 50, 100],
			counts: [1, 0]
		},
		overlaysModel: {
			markers: [
				{ timeMs: 0, label: 'Intro', kind: 'segment-start' },
				{ timeMs: 1000, label: 'Task', kind: 'segment-start' }
			]
		},
		...(overrides.visuals ?? {})
	};

	const bundle: CaseOutputBundle = {
		caseInfo,
		runConfig: {
			detection: {
				velocityThresholdDegPerSec: 120
			},
			metrics: {
				includeRatePerMin: true
			},
			visualization: {
				binWidthMs: 100
			},
			...(overrides.runConfig ?? {})
		},
		tables,
		visuals,
		animation:
			overrides.animation === undefined
				? {
						frames: [
							{ timeMs: 0, x: 0, y: 0, marker: 'start' },
							{ timeMs: 100, x: 1, y: 1, marker: 'cue' }
						]
					}
				: overrides.animation,
		files: overrides.files ?? baseFiles()
	};

	return bundle;
}

function makeBundleWithoutAnimation(): CaseOutputBundle {
	return makeBundle({
		animation: undefined,
		files: baseFiles().filter((file) => file.category !== 'animation')
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
				generatedAtIso: '2026-03-16T12:00:00.000Z'
			}
		},
		{
			key: 'runConfigJson',
			relativePath: 'metadata/run-config.json',
			format: 'json',
			category: 'metadata',
			optional: false,
			content: {
				detection: {
					velocityThresholdDegPerSec: 120
				},
				metrics: {
					includeRatePerMin: true
				}
			}
		},
		{
			key: 'perSaccadeCsv',
			relativePath: 'analysis/per-saccade.csv',
			format: 'csv',
			category: 'analysis',
			optional: false,
			content: [
				{ startTimeMs: 100, endTimeMs: 140, durationMs: 40, amplitudeDeg: 3.5 },
				{ startTimeMs: 200, endTimeMs: 245, durationMs: 45, amplitudeDeg: 4.25 }
			]
		},
		{
			key: 'sessionSummaryCsv',
			relativePath: 'analysis/session-summary.csv',
			format: 'csv',
			category: 'analysis',
			optional: false,
			content: [
				{ segmentId: 'session', count: 2, durationMs: 145, ratePerSec: 13.7931034483 }
			]
		},
		{
			key: 'isiHistogramCsv',
			relativePath: 'analysis/isi-histogram.csv',
			format: 'csv',
			category: 'analysis',
			optional: false,
			content: [
				{ binStartMs: 0, binEndMs: 50, count: 1 },
				{ binStartMs: 50, binEndMs: 100, count: 0 }
			]
		},
		{
			key: 'mainTimelinePng',
			relativePath: 'visuals/main-timeline.png',
			format: 'png',
			category: 'visuals',
			optional: false,
			content: buildScatterFigureSpec(
				{
					points: [
						{ timeMs: 100, amplitudeDeg: 3.5 },
						{ timeMs: 200, amplitudeDeg: 4.25 }
					]
				},
				{
					title: 'Main Timeline',
					dimensions: { widthPx: 1600, heightPx: 900, dpi: 300 }
				}
			)
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
					{ tMs: 100, marker: 'cue' }
				]
			}
		}
	];
}
