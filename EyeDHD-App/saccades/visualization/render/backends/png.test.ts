// visualization/render/backends/png.test.ts

import { describe, expect, it } from 'vitest';

import { buildScatterFigureSpec } from '@saccades/visualization/render';
import { createDeterministicPngBackend } from '@saccades/visualization/render/backends/png';

describe('Visualization Rendering Layer — PNG Backend', () => {
	describe('A — Backend Contract', () => {
		it('A1) — Creates a PNG backend with stable kind and declared png support', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Verify that the backend exposes the expected kind, supported formats, and render function
			expect(backend.kind).toBe('deterministic-png');
			expect(backend.supportedFormats).toEqual(['png']);
			expect(typeof backend.renderFigure).toBe('function');
		});

		it('A2) — Returns a PNG artifact with the expected base metadata shape', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build a scatter spec and a render context to feed the backend
			const spec = makeScatterSpec();
			const context = makeContext();
			// Render the figure to obtain an artifact
			const result = backend.renderFigure(spec, context);
			// Verify that the artifact carries the expected PNG metadata and a Uint8Array payload
			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
			expect(result.widthPx).toBe(context.widthPx);
			expect(result.heightPx).toBe(context.heightPx);
			expect(result.dpi).toBe(context.dpi);
			expect(result.data).toBeInstanceOf(Uint8Array);
		});

		it('A3) — Returns PNG byte data that is non-empty', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build a scatter spec and a render context to feed the backend
			const spec = makeScatterSpec();
			const context = makeContext();
			// Render the figure to obtain an artifact
			const result = backend.renderFigure(spec, context);
			// Verify that the rendered byte payload is non-empty
			expect(result.data.length).toBeGreaterThan(0);
		});
	});

	describe('B — Deterministic Output', () => {
		it('B1) — Produces identical bytes for identical spec and context inputs', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build a single spec and context to be reused across both render calls
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
			// Render the same spec and context twice
			const resultA = backend.renderFigure(spec, context);
			const resultB = backend.renderFigure(spec, context);
			// Verify that both renders produce structurally and byte-identical artifacts
			expect(resultA).toEqual(resultB);
			expect(Array.from(resultA.data)).toEqual(Array.from(resultB.data));
		});

		it('B2) — Produces different bytes when the figure dimensions change', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build two specs that differ only in widthPx
			const specA = makeScatterSpec({
				widthPx: 1200,
				heightPx: 800
			});
			const specB = makeScatterSpec({
				widthPx: 1400,
				heightPx: 800
			});
			// Build matching render contexts for each spec
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
			// Render both spec and context pairs
			const resultA = backend.renderFigure(specA, contextA);
			const resultB = backend.renderFigure(specB, contextB);
			// Verify that the differing dimensions produce distinct byte payloads
			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('B3) — Produces different bytes when the render dpi changes', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build a single spec to be reused across both render calls
			const spec = makeScatterSpec({
				widthPx: 1200,
				heightPx: 800
			});
			// Render the spec at 300 dpi
			const resultA = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 1200,
					heightPx: 800,
					dpi: 300
				})
			);
			// Render the same spec at 600 dpi
			const resultB = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 1200,
					heightPx: 800,
					dpi: 600
				})
			);
			// Verify that the differing dpi produces distinct byte payloads
			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('B4) — Produces different bytes when the render background changes', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build a single spec to be reused across both render calls
			const spec = makeScatterSpec({
				widthPx: 1200,
				heightPx: 800
			});
			// Render the spec on a white background
			const resultA = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 1200,
					heightPx: 800,
					dpi: 300,
					background: 'white'
				})
			);
			// Render the same spec on a transparent background
			const resultB = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 1200,
					heightPx: 800,
					dpi: 300,
					background: 'transparent'
				})
			);
			// Verify that the differing background produces distinct byte payloads
			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});
	});

	describe('C — Context and Metadata Fidelity', () => {
		it('C1) — Reflects the provided context width, height, and dpi in the returned artifact metadata', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build a scatter spec sized to match the render context
			const spec = makeScatterSpec({
				widthPx: 1600,
				heightPx: 900
			});
			// Render the spec with an explicit context width, height, and dpi
			const result = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 1600,
					heightPx: 900,
					dpi: 600
				})
			);
			// Verify that the artifact metadata mirrors the supplied context values
			expect(result.widthPx).toBe(1600);
			expect(result.heightPx).toBe(900);
			expect(result.dpi).toBe(600);
		});

		it('C2) — Uses execution context values rather than deriving output metadata from unrelated internal defaults', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build a scatter spec whose dimensions deliberately differ from the context
			const spec = makeScatterSpec({
				widthPx: 1000,
				heightPx: 500
			});
			// Render the spec with a context that overrides the spec dimensions
			const result = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 2000,
					heightPx: 1000,
					dpi: 450
				})
			);
			// Verify that the artifact reflects the context values, not the spec dimensions
			expect(result.widthPx).toBe(2000);
			expect(result.heightPx).toBe(1000);
			expect(result.dpi).toBe(450);
		});

		it('C3) — Preserves PNG format and mime type regardless of context variation', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build a default scatter spec
			const spec = makeScatterSpec();
			// Render the spec with an unusual context to confirm format stability
			const result = backend.renderFigure(
				spec,
				makeContext({
					widthPx: 900,
					heightPx: 900,
					dpi: 150,
					background: 'transparent'
				})
			);
			// Verify that the format and mime type remain PNG regardless of context variation
			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
		});
	});

	describe('D — Figure Spec Coverage', () => {
		it('D1) — Accepts a valid scatter figure spec produced by the render-layer builders', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build a scatter spec via the real render-layer builder
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
			// Render the builder-produced spec with a matching context
			const result = backend.renderFigure(
				spec,
				makeContext({
					widthPx: readWidthPx(spec),
					heightPx: readHeightPx(spec),
					dpi: 300
				})
			);
			// Verify that the backend accepts the builder output and emits a non-empty payload
			expect(result.data.length).toBeGreaterThan(0);
		});

		it('D2) — Produces different bytes when overlay markers change', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build two specs that differ only in their overlay marker label
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
			// Build a single shared render context for both specs
			const context = makeContext({
				widthPx: readWidthPx(specA),
				heightPx: readHeightPx(specA),
				dpi: 300
			});
			// Render both specs with the shared context
			const resultA = backend.renderFigure(specA, context);
			const resultB = backend.renderFigure(specB, context);
			// Verify that the differing overlay markers produce distinct byte payloads
			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});

		it('D3) — Produces different bytes when the figure title changes', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build two scatter specs that differ only in their title
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
			// Build matching render contexts for each spec
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
			// Render both spec and context pairs
			const resultA = backend.renderFigure(specA, contextA);
			const resultB = backend.renderFigure(specB, contextB);
			// Verify that the differing titles produce distinct byte payloads
			expect(Array.from(resultA.data)).not.toEqual(Array.from(resultB.data));
		});
	});

	describe('E — Separation from Filesystem and Export Concerns', () => {
		it('E1) — Returns bytes and metadata only, without file path information', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Render a default scatter spec to obtain an artifact
			const result = backend.renderFigure(makeScatterSpec(), makeContext());
			// Verify that the artifact does not leak any filesystem path properties
			expect(result).not.toHaveProperty('path');
			expect(result).not.toHaveProperty('relativePath');
			expect(result).not.toHaveProperty('fileName');
			expect(result).not.toHaveProperty('outputPath');
		});

		it('E2) — Does not require any export-writer descriptors or filesystem inputs to render', () => {
			// Load the deterministic PNG backend
			const backend = createDeterministicPngBackend();
			// Build a default scatter spec and render context
			const spec = makeScatterSpec();
			const context = makeContext();
			// Verify that rendering completes without requiring any filesystem inputs
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