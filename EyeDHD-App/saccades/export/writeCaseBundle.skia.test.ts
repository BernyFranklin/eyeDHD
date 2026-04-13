// saccades/export/writeCaseBundle.skia.test.ts
// Integration test: validates that writeCaseBundle produces real,
// viewable PNG files when wired to the Skia backend.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { writeCaseBundle } from '@saccades/export/writeCaseBundle';
import { buildScatterFigureSpec } from '@saccades/visualization/render';
import { createSkiaCanvasPngBackend } from '@saccades/visualization/render/backends/png';

import type {
	CaseOutputBundle,
	CaseOutputFileDescriptor,
	WriteCaseBundleOptions
} from '@saccades/export/types';

// PNG magic bytes: every valid PNG starts with this 8-byte signature
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe('Export Writer Layer — Skia PNG Integration', () => {
	it('writes a valid PNG file using the real Skia backend', () => {
		const rootDir = makeTempDir();
		const backend = createSkiaCanvasPngBackend();

		const bundle = makeBundle({
			files: [
				makePngDescriptor({
					relativePath: 'figures/scatter.png',
					content: buildScatterFigureSpec(
						{
							points: [
								{ timeMs: 100, amplitudeDeg: 2.5 },
								{ timeMs: 250, amplitudeDeg: 4.1 },
								{ timeMs: 400, amplitudeDeg: 3.2 },
								{ timeMs: 600, amplitudeDeg: 1.8 },
								{ timeMs: 800, amplitudeDeg: 5.0 }
							]
						},
						{
							title: 'Saccade Scatter — Skia Integration',
							dimensions: { widthPx: 1200, heightPx: 800, dpi: 300 }
						}
					)
				})
			]
		});

		const result = writeCaseBundle(
			bundle,
			makeOptions({
				rootDir,
				png: { backend, dpi: 300, background: 'white' }
			})
		);

		const outputPath = path.join(
			rootDir,
			result.caseFolderName,
			'figures/scatter.png'
		);

		// File exists on disk
		expect(fs.existsSync(outputPath)).toBe(true);

		const bytes = fs.readFileSync(outputPath);

		// Non-trivial size — real PNG, not a stub
		expect(bytes.byteLength).toBeGreaterThan(256);

		// Starts with the PNG magic signature
		expect(bytes.subarray(0, 8)).toEqual(PNG_SIGNATURE);
	});

	it('uses the Skia backend, not a test or deterministic backend', () => {
		const rootDir = makeTempDir();
		const backend = createSkiaCanvasPngBackend();

		expect(backend.kind).toBe('skia-canvas-png');

		const bundle = makeBundle({
			files: [
				makePngDescriptor({ relativePath: 'figures/scatter.png' })
			]
		});

		writeCaseBundle(
			bundle,
			makeOptions({
				rootDir,
				png: { backend, dpi: 300, background: 'white' }
			})
		);
	});

	it('respects dpi and background options passed through to the Skia backend', () => {
		const rootDir = makeTempDir();
		const backend = createSkiaCanvasPngBackend();

		const bundle = makeBundle({
			files: [
				makePngDescriptor({ relativePath: 'figures/scatter.png' })
			]
		});

		const resultWhite = writeCaseBundle(
			bundle,
			makeOptions({
				rootDir,
				caseFolderName: 'case-white',
				png: { backend, dpi: 300, background: 'white' }
			})
		);

		const resultTransparent = writeCaseBundle(
			bundle,
			makeOptions({
				rootDir,
				caseFolderName: 'case-transparent',
				png: { backend, dpi: 300, background: 'transparent' }
			})
		);

		const pngWhite = fs.readFileSync(
			path.join(rootDir, resultWhite.caseFolderName, 'figures/scatter.png')
		);
		const pngTransparent = fs.readFileSync(
			path.join(rootDir, resultTransparent.caseFolderName, 'figures/scatter.png')
		);

		// Both are valid PNGs
		expect(pngWhite.subarray(0, 8)).toEqual(PNG_SIGNATURE);
		expect(pngTransparent.subarray(0, 8)).toEqual(PNG_SIGNATURE);

		// Different background produces different bytes
		expect(pngWhite.equals(pngTransparent)).toBe(false);
	});
});

function makeTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), 'saccades-skia-'));
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
	const files = overrides.files ?? [makePngDescriptor()];

	return {
		caseInfo: {
			participantId: 'P-001',
			caseId: 'case-skia-integration',
			generatedAtIso: '2026-01-01T00:00:00.000Z'
		},
		runConfig: {},
		tables: {
			perSaccadeRows: [],
			sessionSummaryRows: [],
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
				dimensions: { widthPx: 1200, heightPx: 800, dpi: 300 }
			}
		),
		...overrides
	};
}
