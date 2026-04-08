// visualization/render/backends/png.test.ts

import { describe, expect, it } from 'vitest';

import { buildScatterFigureSpec } from '@saccades/visualization/render';
import { createDeterministicPngBackend } from '@saccades/visualization/render/backends/png';

describe('Visualization Rendering Layer — PNG Backend', () => {
	describe('A — Backend Contract', () => {
		it('A1 — creates a PNG backend with stable kind and declared png support', () => {
			const backend = createDeterministicPngBackend();

			expect(backend.kind).toBe('deterministic-png');
			expect(backend.supportedFormats).toEqual(['png']);
			expect(typeof backend.renderFigure).toBe('function');
		});

		it('A2 — returns a PNG artifact with the expected base metadata shape', () => {
			const backend = createDeterministicPngBackend();

			const spec = makeScatterSpec();
			const context = makeContext();

			const result = backend.renderFigure(spec, context);

			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
			expect(result.widthPx).toBe(context.widthPx);
			expect(result.heightPx).toBe(context.heightPx);
			expect(result.dpi).toBe(context.dpi);
			expect(result.data).toBeInstanceOf(Uint8Array);
		});

		it('A3 — returns PNG byte data that is non-empty', () => {
			const backend = createDeterministicPngBackend();

			const spec = makeScatterSpec();
			const context = makeContext();

			const result = backend.renderFigure(spec, context);

			expect(result.data.length).toBeGreaterThan(0);
		});
	});

	describe('B — Deterministic Output', () => {
		it('B1 — produces identical bytes for identical spec and context inputs', () => {
			const backend = createDeterministicPngBackend();

			const spec = makeScatterSpec({
				widthPx: 1200,
				heightPx: 800
			});
			const context = makeContext({
				widthPx: 1200,
				heightPx: 800,
				dpi: 300,
				background: 'white'
			});

			const resultA = backend.renderFigure(spec, context);
			const resultB = backend.renderFigure(spec, context);

			expect(resultA).toEqual(resultB);
			expect(Array.from(resultA.data)).toEqual(Array.from(resultB.data));
		});

		it('B2 — produces different bytes when the figure dimensions change', () => {
			const backend = createDeterministicPngBackend();

			const specA = makeScatterSpec({
				widthPx: 1200,
				heightPx: 800
			});
			const specB = makeScatterSpec({
				widthPx: 1400,
				heightPx: 800
			});

			const contextA = makeContext({
				widthPx: 1200,
				heightPx: 800,
				dpi: 300
			});
			const contextB = makeContext({
				widthPx: 1400,
				heightPx: 800,
				dpi: 300
			});

			const resultA = backend.renderFigure(specA, contextA);
			const resultB = backend.renderFigure(specB, contextB);

			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('B3 — produces different bytes when the render dpi changes', () => {
			const backend = createDeterministicPngBackend();

			const spec = makeScatterSpec({
				widthPx: 1200,
				heightPx: 800
			});

			const resultA = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 1200,
					heightPx: 800,
					dpi: 300
				})
			);

			const resultB = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 1200,
					heightPx: 800,
					dpi: 600
				})
			);

			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('B4 — produces different bytes when the render background changes', () => {
			const backend = createDeterministicPngBackend();

			const spec = makeScatterSpec({
				widthPx: 1200,
				heightPx: 800
			});

			const resultA = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 1200,
					heightPx: 800,
					dpi: 300,
					background: 'white'
				})
			);

			const resultB = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 1200,
					heightPx: 800,
					dpi: 300,
					background: 'transparent'
				})
			);

			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});
	});

	describe('C — Context and Metadata Fidelity', () => {
		it('C1 — reflects the provided context width, height, and dpi in the returned artifact metadata', () => {
			const backend = createDeterministicPngBackend();

			const spec = makeScatterSpec({
				widthPx: 1600,
				heightPx: 900
			});

			const result = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 1600,
					heightPx: 900,
					dpi: 600
				})
			);

			expect(result.widthPx).toBe(1600);
			expect(result.heightPx).toBe(900);
			expect(result.dpi).toBe(600);
		});

		it('C2 — uses execution context values rather than deriving output metadata from unrelated internal defaults', () => {
			const backend = createDeterministicPngBackend();

			const spec = makeScatterSpec({
				widthPx: 1000,
				heightPx: 500
			});

			const result = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 2000,
					heightPx: 1000,
					dpi: 450
				})
			);

			expect(result.widthPx).toBe(2000);
			expect(result.heightPx).toBe(1000);
			expect(result.dpi).toBe(450);
		});

		it('C3 — preserves png format and mime type regardless of context variation', () => {
			const backend = createDeterministicPngBackend();

			const spec = makeScatterSpec();

			const result = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 900,
					heightPx: 900,
					dpi: 150,
					background: 'transparent'
				})
			);

			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
		});
	});

	describe('D — Figure Spec Coverage', () => {
		it('D1 — accepts a valid scatter figure spec produced by the render-layer builders', () => {
			const backend = createDeterministicPngBackend();

			const spec = buildScatterFigureSpec(
				{
					points: [
						{ timeMs: 50, amplitudeDeg: 1.2 },
						{ timeMs: 100, amplitudeDeg: 2.8 },
						{ timeMs: 150, amplitudeDeg: 1.9 }
					]
				},
				{
					title: 'Scatter'
				}
			);

			const result = backend.renderFigure(
				spec,
				makeContext({
					widthPx: readWidthPx(spec),
					heightPx: readHeightPx(spec),
					dpi: 300
				})
			);

			expect(result.data.length).toBeGreaterThan(0);
		});

		it('D2 — produces different bytes when overlay markers change', () => {
			const backend = createDeterministicPngBackend();

			const specA = makeScatterSpec({
				overlays: {
					markers: [{ timeMs: 250, label: 'Event A', kind: 'event' }]
				}
			});

			const specB = makeScatterSpec({
				overlays: {
					markers: [{ timeMs: 250, label: 'Event B', kind: 'event' }]
				}
			});

			const context = makeContext({
				widthPx: readWidthPx(specA),
				heightPx: readHeightPx(specA),
				dpi: 300
			});

			const resultA = backend.renderFigure(specA, context);
			const resultB = backend.renderFigure(specB, context);

			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('D3 — produces different bytes when the figure title changes', () => {
			const backend = createDeterministicPngBackend();

			const specA = buildScatterFigureSpec(
				{
					points: [
						{ timeMs: 100, amplitudeDeg: 2.5 },
						{ timeMs: 200, amplitudeDeg: 3.5 }
					]
				},
				{
					title: 'Figure A'
				}
			);

			const specB = buildScatterFigureSpec(
				{
					points: [
						{ timeMs: 100, amplitudeDeg: 2.5 },
						{ timeMs: 200, amplitudeDeg: 3.5 }
					]
				},
				{
					title: 'Figure B'
				}
			);

			const contextA = makeContext({
				widthPx: readWidthPx(specA),
				heightPx: readHeightPx(specA),
				dpi: 300
			});

			const contextB = makeContext({
				widthPx: readWidthPx(specB),
				heightPx: readHeightPx(specB),
				dpi: 300
			});

			const resultA = backend.renderFigure(specA, contextA);
			const resultB = backend.renderFigure(specB, contextB);

			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});
	});

	describe('E — Separation from Filesystem and Export Concerns', () => {
		it('E1 — returns bytes and metadata only, without file path information', () => {
			const backend = createDeterministicPngBackend();

			const result = backend.renderFigure(makeScatterSpec(), makeContext());

			expect(result).not.toHaveProperty('path');
			expect(result).not.toHaveProperty('relativePath');
			expect(result).not.toHaveProperty('fileName');
			expect(result).not.toHaveProperty('outputPath');
		});

		it('E2 — does not require any export-writer descriptors or filesystem inputs to render', () => {
			const backend = createDeterministicPngBackend();

			const spec = makeScatterSpec();
			const context = makeContext();

			expect(() => backend.renderFigure(spec, context)).not.toThrow();
		});
	});
});

function makeScatterSpec(options?: {
	widthPx?: number;
	heightPx?: number;
	overlays?: unknown;
}): ReturnType<typeof buildScatterFigureSpec> {
	const base = buildScatterFigureSpec(
		{
			points: [
				{ timeMs: 100, amplitudeDeg: 2.5 },
				{ timeMs: 250, amplitudeDeg: 4.1 },
				{ timeMs: 400, amplitudeDeg: 3.2 }
			]
		},
		{
			title: 'Scatter Figure'
		}
	);

	return {
		...base,
		dimensions: {
			...base.dimensions,
			widthPx: options?.widthPx ?? base.dimensions.widthPx,
			heightPx: options?.heightPx ?? base.dimensions.heightPx
		},
		overlays: options?.overlays ?? base.overlays
	};
}

function makeContext(overrides?: {
	widthPx?: number;
	heightPx?: number;
	dpi?: number;
	background?: 'white' | 'transparent';
}) {
	return {
		widthPx: overrides?.widthPx ?? 1200,
		heightPx: overrides?.heightPx ?? 800,
		dpi: overrides?.dpi ?? 300,
		background: overrides?.background ?? 'white'
	} as const;
}

function readWidthPx(spec: { dimensions: { widthPx: number } }): number {
	return spec.dimensions.widthPx;
}

function readHeightPx(spec: { dimensions: { heightPx: number } }): number {
	return spec.dimensions.heightPx;
}