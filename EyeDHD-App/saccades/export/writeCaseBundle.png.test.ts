// saccades/export/writeCaseBundle.png.test.ts

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { writeCaseBundle } from '@saccades/export/writeCaseBundle';
import { buildScatterFigureSpec } from '@saccades/visualization/render';
import type { FigureRenderSpec } from '@saccades/visualization/render';
import type { PngFigureRenderBackend } from '@saccades/visualization/render/backends/types';

import type {
	CaseOutputBundle,
	CaseOutputFileDescriptor,
	WriteCaseBundleOptions
} from '@saccades/export/types';

describe('Export Writer Layer — PNG Export Integration', () => {
	describe('A — PNG File Creation', () => {
		it('A1 — writes a PNG file for a png descriptor using the injected backend', () => {
			const rootDir = makeTempDir();
			const backend = makeBackend();

			const bundle = makeBundle({
				files: [
					makePngDescriptor({
						key: 'scatterFigure',
						relativePath: 'figures/scatter.png'
					})
				]
			});

			const result = writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					png: {
						backend,
						dpi: 300,
						background: 'white'
					}
				})
			);

			const outputPath = path.join(rootDir, result.caseFolderName, 'figures/scatter.png');

			expect(fs.existsSync(outputPath)).toBe(true);
			expect(fs.readFileSync(outputPath)).toEqual(Buffer.from([176, 32, 44, 1]));
		});

		it('A2 — writes the exact bytes returned by renderPngFigure backend output', () => {
			const rootDir = makeTempDir();

			const backend = makeBackend({
				data: Uint8Array.from([9, 8, 7, 6, 5])
			});

			const bundle = makeBundle({
				files: [
					makePngDescriptor({
						relativePath: 'figures/rate-series.png'
					})
				]
			});

			const result = writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					png: {
						backend,
						dpi: 300,
						background: 'white'
					}
				})
			);

			const outputPath = path.join(rootDir, result.caseFolderName, 'figures/rate-series.png');

			expect(fs.readFileSync(outputPath)).toEqual(Buffer.from([9, 8, 7, 6, 5]));
		});

		it('A3 — creates parent directories needed for nested png output paths', () => {
			const rootDir = makeTempDir();
			const backend = makeBackend();

			const bundle = makeBundle({
				files: [
					makePngDescriptor({
						relativePath: 'visuals/publication/session/scatter.png'
					})
				]
			});

			const result = writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					png: {
						backend,
						dpi: 300,
						background: 'white'
					}
				})
			);

			const outputPath = path.join(
				rootDir,
				result.caseFolderName,
				'visuals/publication/session/scatter.png'
			);

			expect(fs.existsSync(outputPath)).toBe(true);
		});
	});

	describe('B — Backend Injection and Execution', () => {
		it('B1 — renders png output through the injected backend exactly once per png descriptor', () => {
			const rootDir = makeTempDir();
			const backend = makeBackend();

			const bundle = makeBundle({
				files: [
					makePngDescriptor({ relativePath: 'figures/a.png' }),
					makePngDescriptor({ relativePath: 'figures/b.png' })
				]
			});

			writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					png: {
						backend,
						dpi: 300,
						background: 'white'
					}
				})
			);

			expect(backend.renderFigureCalls).toHaveLength(2);
		});

		it('B2 — passes descriptor render spec dimensions to the rendering pipeline', () => {
			const rootDir = makeTempDir();
			const backend = makeBackend();

			const descriptor = makePngDescriptor({
				relativePath: 'figures/scatter.png',
				content: buildScatterFigureSpec(
					{
						points: [
							{ timeMs: 100, amplitudeDeg: 2.5 },
							{ timeMs: 250, amplitudeDeg: 4.1 },
							{ timeMs: 400, amplitudeDeg: 3.2 }
						]
					},
					{
						title: 'Scatter Figure',
						dimensions: {
							widthPx: 1600,
							heightPx: 900,
							dpi: 300
						}
					}
				)
			});

			writeCaseBundle(
				makeBundle({ files: [descriptor] }),
				makeOptions({
					rootDir,
					png: {
						backend,
						dpi: 600,
						background: 'white'
					}
				})
			);

			expect(backend.renderFigureCalls).toHaveLength(1);
			expect(backend.renderFigureCalls[0]?.spec.figureId).toBe((descriptor.content as FigureRenderSpec).figureId);
			expect(backend.renderFigureCalls[0]?.context).toEqual({
				widthPx: 1600,
				heightPx: 900,
				dpi: 600,
				background: 'white'
			});
		});

		it('B3 — passes png execution options from write options into the rendering call', () => {
			const rootDir = makeTempDir();
			const backend = makeBackend();

			writeCaseBundle(
				makeBundle({
					files: [makePngDescriptor({ relativePath: 'figures/scatter.png' })]
				}),
				makeOptions({
					rootDir,
					png: {
						backend,
						dpi: 450,
						background: 'transparent'
					}
				})
			);

			expect(backend.renderFigureCalls).toHaveLength(1);
			expect(backend.renderFigureCalls[0]?.context).toEqual({
				widthPx: 1200,
				heightPx: 800,
				dpi: 450,
				background: 'transparent'
			});
		});
	});

	describe('C — Deterministic PNG Export', () => {
		it('C1 — writes identical png bytes for identical bundle inputs and rendering options', () => {
			const rootDir = makeTempDir();
			const backendA = makeBackend();
			const backendB = makeBackend();

			const bundle = makeBundle({
				files: [makePngDescriptor({ relativePath: 'figures/scatter.png' })]
			});

			const resultA = writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					caseFolderName: 'case-a',
					png: {
						backend: backendA,
						dpi: 300,
						background: 'white'
					}
				})
			);

			const resultB = writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					caseFolderName: 'case-b',
					png: {
						backend: backendB,
						dpi: 300,
						background: 'white'
					}
				})
			);

			const pngA = fs.readFileSync(path.join(rootDir, resultA.caseFolderName, 'figures/scatter.png'));
			const pngB = fs.readFileSync(path.join(rootDir, resultB.caseFolderName, 'figures/scatter.png'));

			expect(pngA).toEqual(pngB);
		});

		it('C2 — writes different png bytes when rendering options differ', () => {
			const rootDir = makeTempDir();
			const bundle = makeBundle({
				files: [makePngDescriptor({ relativePath: 'figures/scatter.png' })]
			});

			const resultA = writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					caseFolderName: 'case-white',
					png: {
						backend: makeBackend(),
						dpi: 300,
						background: 'white'
					}
				})
			);

			const resultB = writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					caseFolderName: 'case-transparent',
					png: {
						backend: makeBackend(),
						dpi: 300,
						background: 'transparent'
					}
				})
			);

			const pngA = fs.readFileSync(
				path.join(rootDir, resultA.caseFolderName, 'figures/scatter.png')
			);
			const pngB = fs.readFileSync(
				path.join(rootDir, resultB.caseFolderName, 'figures/scatter.png')
			);

			expect(pngA.equals(pngB)).toBe(false);
		});
	});

	describe('D — Mixed Export Sets', () => {
		it('D1 — writes csv, json, and png outputs together in one case bundle', () => {
			const rootDir = makeTempDir();
			const backend = makeBackend();

			const bundle = makeBundle({
				files: [
					makeCsvDescriptor(),
					makeJsonDescriptor(),
					makePngDescriptor({ relativePath: 'figures/scatter.png' })
				]
			});

			const result = writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					png: {
						backend,
						dpi: 300,
						background: 'white'
					}
				})
			);

			const caseDir = path.join(rootDir, result.caseFolderName);

			expect(fs.existsSync(path.join(caseDir, 'tables/per_saccade.csv'))).toBe(true);
			expect(fs.existsSync(path.join(caseDir, 'metadata/caseInfo.json'))).toBe(true);
			expect(fs.existsSync(path.join(caseDir, 'figures/scatter.png'))).toBe(true);
		});

		it('D2 — preserves non-png export behavior while adding png outputs', () => {
			const rootDir = makeTempDir();
			const backend = makeBackend();

			const bundle = makeBundle({
				files: [
					makeCsvDescriptor(),
					makeJsonDescriptor(),
					makePngDescriptor({ relativePath: 'figures/scatter.png' })
				]
			});

			const result = writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					png: {
						backend,
						dpi: 300,
						background: 'white'
					}
				})
			);

			const caseDir = path.join(rootDir, result.caseFolderName);

			expect(fs.readFileSync(path.join(caseDir, 'tables/per_saccade.csv'), 'utf8')).toContain(
				'timeMs'
			);
			expect(
				fs.readFileSync(path.join(caseDir, 'metadata/caseInfo.json'), 'utf8')
			).toContain('"participantId"');
			expect(fs.readFileSync(path.join(caseDir, 'figures/scatter.png'))).toEqual(
				Buffer.from([176, 32, 44, 1])
			);
		});
	});

	describe('E — PNG Descriptor Gating', () => {
		it('E1 — does not invoke the png backend when no png descriptors exist', () => {
			const rootDir = makeTempDir();
			const backend = makeBackend();

			const bundle = makeBundle({
				files: [makeCsvDescriptor(), makeJsonDescriptor()]
			});

			writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					png: {
						backend,
						dpi: 300,
						background: 'white'
					}
				})
			);

			expect(backend.renderFigureCalls).toHaveLength(0);
		});

		it('E2 — writes no png files when no png descriptors exist', () => {
			const rootDir = makeTempDir();

			const bundle = makeBundle({
				files: [makeCsvDescriptor(), makeJsonDescriptor()]
			});

			const result = writeCaseBundle(
				bundle,
				makeOptions({
					rootDir,
					png: {
						backend: makeBackend(),
						dpi: 300,
						background: 'white'
					}
				})
			);

			const caseDir = path.join(rootDir, result.caseFolderName);

			expect(fs.existsSync(path.join(caseDir, 'figures/scatter.png'))).toBe(false);
		});

		it('E3 — throws when a png descriptor is present but no png backend is configured', () => {
			const rootDir = makeTempDir();

			const bundle = makeBundle({
				files: [makePngDescriptor({ relativePath: 'figures/scatter.png' })]
			});

			expect(() =>
				writeCaseBundle(
					bundle,
					makeOptions({
						rootDir
					})
				)
			).toThrow(/png backend/i);
		});
	});
});

function makeTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'saccades-step9c-'));
}

function makeOptions(
	overrides: Partial<WriteCaseBundleOptions> = {}
): WriteCaseBundleOptions {
	return {
		rootDir: makeTempDir(),
		...overrides
	};
}

function makeBundle(
	overrides: Partial<CaseOutputBundle> = {}
): CaseOutputBundle {
	const files = overrides.files ?? [
		makeCsvDescriptor(),
		makeJsonDescriptor()
	];

	return {
		caseInfo: {
			participantId: 'P-001',
			caseId: 'case-P001-S001',
			generatedAtIso: '2026-01-01T00:00:00.000Z'
		},
		runConfig: {},
		tables: {
			perSaccadeRows: [
				{ timeMs: 100, amplitudeDeg: 2.5, durationMs: 40 }
			],
			sessionSummaryRows: [
				{ durationMs: 1000, durationSec: 1, ratePerSec: 1.0 }
			],
			segmentSummaryRows: [],
			markerRows: [],
			isiHistogramRows: []
		},
		visuals: {
			scatterModel: { points: [] },
			rateSeriesModel: { binWidthMs: 100, points: [] },
			isiHistogramModel: { binWidthMs: 50, binEdges: [], counts: [] },
			overlaysModel: { markers: [] }
		},
		files,
		...overrides
	};
}

function makeCsvDescriptor(
	overrides: Partial<CaseOutputFileDescriptor<unknown>> = {}
): CaseOutputFileDescriptor<unknown> {
	return {
		key: 'perSaccadeCsv',
		relativePath: 'tables/per_saccade.csv',
		format: 'csv',
		category: 'analysis',
		optional: false,
		content: [
			{ timeMs: 100, amplitudeDeg: 2.5, durationMs: 40 }
		],
		...overrides
	};
}

function makeJsonDescriptor(
	overrides: Partial<CaseOutputFileDescriptor<unknown>> = {}
): CaseOutputFileDescriptor<unknown> {
	return {
		key: 'caseInfoJson',
		relativePath: 'metadata/caseInfo.json',
		format: 'json',
		category: 'metadata',
		optional: false,
		content: {
			participantId: 'P-001',
			sessionId: 'S-001'
		},
		...overrides
	};
}

function makePngDescriptor(
	overrides: Partial<CaseOutputFileDescriptor<unknown>> = {}
): CaseOutputFileDescriptor<unknown> {
	return {
		key: 'scatterPng',
		relativePath: 'figures/scatter.png',
		format: 'png',
		category: 'visuals',
		optional: false,
		content: buildScatterFigureSpec(
			{
				points: [
					{ timeMs: 100, amplitudeDeg: 2.5 },
					{ timeMs: 250, amplitudeDeg: 4.1 },
					{ timeMs: 400, amplitudeDeg: 3.2 }
				]
			},
			{
				title: 'Scatter Figure',
				dimensions: {
					widthPx: 1200,
					heightPx: 800,
					dpi: 300
				}
			}
		),
		...overrides
	};
}

function makeBackend(overrides?: { data?: Uint8Array }): PngFigureRenderBackend & {
	renderFigureCalls: Array<{
		spec: Parameters<PngFigureRenderBackend['renderFigure']>[0];
		context: Parameters<PngFigureRenderBackend['renderFigure']>[1];
	}>;
} {
	const renderFigureCalls: Array<{
		spec: Parameters<PngFigureRenderBackend['renderFigure']>[0];
		context: Parameters<PngFigureRenderBackend['renderFigure']>[1];
	}> = [];

	return {
		kind: 'test-png-backend',
		supportedFormats: ['png'],
		renderFigure(spec, context) {
			renderFigureCalls.push({ spec, context });

			return {
				figureId: spec.figureId,
				format: 'png',
				mimeType: 'image/png',
				widthPx: context.widthPx,
				heightPx: context.heightPx,
				dpi: context.dpi,
				data:
					overrides?.data ??
					Uint8Array.from([
						context.widthPx % 256,
						context.heightPx % 256,
						context.dpi % 256,
						context.background === 'white' ? 1 : 2
					])
			};
		},
		renderFigureCalls
	};
}