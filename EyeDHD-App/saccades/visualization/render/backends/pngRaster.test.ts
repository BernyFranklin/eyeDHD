import { describe, expect, it } from 'vitest';

import {
	buildIsiHistogramFigureSpec,
	buildRateSeriesFigureSpec,
	buildScatterFigureSpec,
	renderPngFigure,
	type FigureRenderSpec
} from '@saccades/visualization/render';
import { createSkiaCanvasPngBackend } from '@saccades/visualization/render/backends/png';

describe('Visualization Rendering Layer — Real PNG Raster Backend', () => {
	describe('A — Backend Contract', () => {
		it('A1 — creates a PNG backend with stable kind and declared png support', () => {
			const backend = createSkiaCanvasPngBackend();

			expect(backend.kind).toBe('skia-canvas-png');
			expect(backend.supportedFormats).toEqual(['png']);
			expect(typeof backend.renderFigure).toBe('function');
		});

		it('A2 — renders a PNG artifact with expected metadata through renderPngFigure', () => {
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(result.figureId).toBe(spec.figureId);
			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
			expect(result.widthPx).toBe(spec.dimensions.widthPx);
			expect(result.heightPx).toBe(spec.dimensions.heightPx);
			expect(result.dpi).toBe(300);
			expect(result.data).toBeInstanceOf(Uint8Array);
			expect(result.data.length).toBeGreaterThan(0);
		});

		it('A3 — preserves transparent background metadata when requested', () => {
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'transparent'
			});

			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
			expect(result.widthPx).toBe(spec.dimensions.widthPx);
			expect(result.heightPx).toBe(spec.dimensions.heightPx);
			expect(result.dpi).toBe(300);
			expect(result.data.length).toBeGreaterThan(0);
		});
	});

	describe('B — Deterministic Raster Output', () => {
		it('B1 — produces identical PNG bytes for identical scatter spec and options', () => {
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			const resultA = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(resultA).toEqual(resultB);
			expect(Array.from(resultA.data)).toEqual(Array.from(resultB.data));
		});

		it('B2 — produces different PNG bytes when scatter geometry changes', () => {
			const backend = createSkiaCanvasPngBackend();

			const specA = buildScatterFigureSpec(
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

			const specB = buildScatterFigureSpec(
				{
					points: [
						{ timeMs: 100, amplitudeDeg: 2.5 },
						{ timeMs: 250, amplitudeDeg: 6.8 },
						{ timeMs: 400, amplitudeDeg: 3.2 }
					]
				},
				{
					title: 'Scatter Figure'
				}
			);

			const resultA = renderPngFigure(specA, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(specB, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('B3 — produces different PNG bytes when the title changes', () => {
			const backend = createSkiaCanvasPngBackend();

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

			const resultA = renderPngFigure(specA, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(specB, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('B4 — produces different PNG bytes when the background changes', () => {
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			const resultA = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'transparent'
			});

			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});
	});

	describe('C — Geometry Coverage', () => {
		it('C1 — renders scatter geometry to non-empty PNG bytes', () => {
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(result.data.length).toBeGreaterThan(0);
		});

		it('C2 — renders rate-series geometry to non-empty PNG bytes', () => {
			const backend = createSkiaCanvasPngBackend();

			const spec = buildRateSeriesFigureSpec(
				{
					points: [
						{ timeMs: 0, ratePerSec: 0.5 },
						{ timeMs: 250, ratePerSec: 1.25 },
						{ timeMs: 500, ratePerSec: 0.9 }
					]
				},
				{
					title: 'Rate Series'
				}
			);

			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(result.figureId).toBe(spec.figureId);
			expect(result.data.length).toBeGreaterThan(0);
		});

		it('C3 — renders histogram geometry to non-empty PNG bytes', () => {
			const backend = createSkiaCanvasPngBackend();

			const spec = buildIsiHistogramFigureSpec(
				{
					bins: [
						{ binStartMs: 0, binEndMs: 50, count: 1 },
						{ binStartMs: 50, binEndMs: 100, count: 3 },
						{ binStartMs: 100, binEndMs: 150, count: 2 }
					]
				},
				{
					title: 'ISI Histogram'
				}
			);

			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(result.figureId).toBe(spec.figureId);
			expect(result.data.length).toBeGreaterThan(0);
		});
	});

	describe('D — Overlay and Style Fidelity', () => {
		it('D1 — renders overlay markers deterministically', () => {
			const backend = createSkiaCanvasPngBackend();

			const spec = buildScatterFigureSpec(
				{
					points: [
						{ timeMs: 100, amplitudeDeg: 2.5 },
						{ timeMs: 250, amplitudeDeg: 4.1 },
						{ timeMs: 400, amplitudeDeg: 3.2 }
					]
				},
				{
					title: 'Scatter Figure',
					overlays: {
						markers: [{ timeMs: 250, label: 'Distractor', kind: 'event' }]
					}
				}
			);

			const resultA = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(Array.from(resultA.data)).toEqual(Array.from(resultB.data));
		});

		it('D2 — changes PNG bytes when overlay markers change', () => {
			const backend = createSkiaCanvasPngBackend();

			const specA = buildScatterFigureSpec(
				{
					points: [
						{ timeMs: 100, amplitudeDeg: 2.5 },
						{ timeMs: 250, amplitudeDeg: 4.1 },
						{ timeMs: 400, amplitudeDeg: 3.2 }
					]
				},
				{
					title: 'Scatter Figure',
					overlays: {
						markers: [{ timeMs: 250, label: 'Event A', kind: 'event' }]
					}
				}
			);

			const specB = buildScatterFigureSpec(
				{
					points: [
						{ timeMs: 100, amplitudeDeg: 2.5 },
						{ timeMs: 250, amplitudeDeg: 4.1 },
						{ timeMs: 400, amplitudeDeg: 3.2 }
					]
				},
				{
					title: 'Scatter Figure',
					overlays: {
						markers: [{ timeMs: 250, label: 'Event B', kind: 'event' }]
					}
				}
			);

			const resultA = renderPngFigure(specA, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(specB, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('D3 — changes PNG bytes when segment boundaries are added', () => {
			const backend = createSkiaCanvasPngBackend();

			const specA = makeScatterSpec();

			const specB = buildScatterFigureSpec(
				{
					points: [
						{ timeMs: 100, amplitudeDeg: 2.5 },
						{ timeMs: 250, amplitudeDeg: 4.1 },
						{ timeMs: 400, amplitudeDeg: 3.2 }
					]
				},
				{
					title: 'Scatter Figure',
					overlays: {
						segmentBoundaries: [{ timeMs: 300, label: 'Boundary' }]
					}
				}
			);

			const resultA = renderPngFigure(specA, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(specB, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});
	});

	describe('E — Step 8 Boundary Preservation', () => {
		it('E1 — returns PNG bytes and metadata without any file path fields', () => {
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(result).not.toHaveProperty('path');
			expect(result).not.toHaveProperty('relativePath');
			expect(result).not.toHaveProperty('fileName');
			expect(result).not.toHaveProperty('outputPath');
		});

		it('E2 — remains usable as an in-memory rendering step independent of export writer orchestration', () => {
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			expect(() =>
				renderPngFigure(spec, backend, {
					dpi: 300,
					background: 'white'
				})
			).not.toThrow();
		});
	});
});

function makeScatterSpec(): FigureRenderSpec {
	return buildScatterFigureSpec(
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
}
