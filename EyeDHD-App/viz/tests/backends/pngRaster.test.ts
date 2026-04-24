import { describe, expect, it } from 'vitest';

import {
	buildIsiHistogramFigureSpec,
	buildRateSeriesFigureSpec,
	buildScatterFigureSpec
} from '@saccades/visualization/render';
import { renderPngFigure, type FigureRenderSpec } from '@viz/render';
import { createSkiaCanvasPngBackend } from '@viz/render/backends/png';

describe('Visualization Rendering Layer — Real PNG Raster Backend', () => {
	describe('A — Backend Contract', () => {
		it('A1) — Creates a PNG backend with stable kind and declared png support', () => {
			// Create the backend
			const backend = createSkiaCanvasPngBackend();
			// Verify the backend reports the expected kind and supported formats
			expect(backend.kind).toBe('skia-canvas-png');
			expect(backend.supportedFormats).toEqual(['png']);
			expect(typeof backend.renderFigure).toBe('function');
		});

		it('A2) — Renders a PNG artifact with expected metadata through renderPngFigure', () => {
			// Create the backend and a scatter spec to feed it
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			// Render the figure through the public renderPngFigure entry point
			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify the artifact metadata mirrors the spec and a non-empty PNG payload was produced
			expect(result.figureId).toBe(spec.figureId);
			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
			expect(result.widthPx).toBe(spec.dimensions.widthPx);
			expect(result.heightPx).toBe(spec.dimensions.heightPx);
			expect(result.dpi).toBe(300);
			expect(result.data).toBeInstanceOf(Uint8Array);
			expect(result.data.length).toBeGreaterThan(0);
		});

		it('A3) — Preserves transparent background metadata when requested', () => {
			// Create the backend and a scatter spec to feed it
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			// Render the figure with a transparent background
			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'transparent'
			});

			// Verify the metadata still describes a valid PNG and the byte payload is non-empty
			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
			expect(result.widthPx).toBe(spec.dimensions.widthPx);
			expect(result.heightPx).toBe(spec.dimensions.heightPx);
			expect(result.dpi).toBe(300);
			expect(result.data.length).toBeGreaterThan(0);
		});
	});

	describe('B — Deterministic Raster Output', () => {
		it('B1) — Produces identical PNG bytes for identical scatter spec and options', () => {
			// Create the backend and a single spec to be reused across both renders
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			// Render the same spec and options twice
			const resultA = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify both renders produce structurally and byte-identical artifacts
			expect(resultA).toEqual(resultB);
			expect(Array.from(resultA.data)).toEqual(Array.from(resultB.data));
		});

		it('B2) — Produces different PNG bytes when scatter geometry changes', () => {
			// Create the backend and two specs that differ only in a single point's amplitude
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

			// Render both specs with identical options
			const resultA = renderPngFigure(specA, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(specB, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify the differing geometry produces distinct PNG byte payloads
			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('B3) — Produces different PNG bytes when the title changes', () => {
			// Create the backend and two specs that differ only in their title text
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

			// Render both specs with identical options
			const resultA = renderPngFigure(specA, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(specB, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify the differing titles produce distinct PNG byte payloads
			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('B4) — Produces different PNG bytes when the background changes', () => {
			// Create the backend and a single spec to be reused across both renders
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			// Render once on a white background and once on a transparent background
			const resultA = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'transparent'
			});

			// Verify the differing background produces distinct PNG byte payloads
			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});
	});

	describe('C — Geometry Coverage', () => {
		it('C1) — Renders scatter geometry to non-empty PNG bytes', () => {
			// Create the backend and a scatter spec
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			// Render the scatter figure
			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify the rendered byte payload is non-empty
			expect(result.data.length).toBeGreaterThan(0);
		});

		it('C2) — Renders rate-series geometry to non-empty PNG bytes', () => {
			// Create the backend and build a rate-series spec via the real builder
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

			// Render the rate-series figure
			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify the artifact carries the source figure id and a non-empty byte payload
			expect(result.figureId).toBe(spec.figureId);
			expect(result.data.length).toBeGreaterThan(0);
		});

		it('C3) — Renders histogram geometry to non-empty PNG bytes', () => {
			// Create the backend and build a histogram spec via the real builder
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

			// Render the histogram figure
			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify the artifact carries the source figure id and a non-empty byte payload
			expect(result.figureId).toBe(spec.figureId);
			expect(result.data.length).toBeGreaterThan(0);
		});
	});

	describe('D — Overlay and Style Fidelity', () => {
		it('D1) — Renders overlay markers deterministically', () => {
			// Create the backend and a scatter spec carrying an overlay marker
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

			// Render the same overlay-bearing spec twice
			const resultA = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify the overlay rendering is deterministic across identical renders
			expect(Array.from(resultA.data)).toEqual(Array.from(resultB.data));
		});

		it('D2) — Changes PNG bytes when overlay markers change', () => {
			// Create the backend and two specs that differ only in their overlay marker label
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

			// Render both specs with identical options
			const resultA = renderPngFigure(specA, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(specB, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify the differing overlay markers produce distinct PNG byte payloads
			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('D3) — Changes PNG bytes when segment boundaries are added', () => {
			// Create the backend and a baseline scatter spec without overlays
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

			// Render the baseline spec and the boundary-bearing spec
			const resultA = renderPngFigure(specA, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(specB, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify adding segment boundaries produces distinct PNG byte payloads
			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});
	});

	describe('E — Step 8 Boundary Preservation', () => {
		it('E1) — Returns PNG bytes and metadata without any file path fields', () => {
			// Create the backend and a scatter spec
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			// Render the figure to obtain an artifact
			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			// Verify the artifact does not leak any filesystem path properties
			expect(result).not.toHaveProperty('path');
			expect(result).not.toHaveProperty('relativePath');
			expect(result).not.toHaveProperty('fileName');
			expect(result).not.toHaveProperty('outputPath');
		});

		it('E2) — Remains usable as an in-memory rendering step independent of export writer orchestration', () => {
			// Create the backend and a scatter spec
			const backend = createSkiaCanvasPngBackend();
			const spec = makeScatterSpec();

			// Verify rendering completes without requiring any filesystem inputs
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
