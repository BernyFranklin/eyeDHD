import { describe, expect, it, vi } from 'vitest';

import {
	buildScatterFigureSpec,
	renderFigureSpec,
	renderPngFigure,
	type FigureRenderBackend,
	type FigureRenderBackendContext,
	type FigureRenderSpec,
	type PngFigureRenderBackend,
	type RenderedPngArtifact
} from '@saccades/visualization/render';

describe('Visualization Rendering Layer — Step 9B PNG Backend Integration', () => {
	describe('A — Generic Backend Execution Boundary', () => {
		it('A1 — renders a figure spec through an injected backend without mutating the input spec', () => {
			const spec = makeScatterSpec();

			const original = structuredClone(spec);

			const backend: FigureRenderBackend<RenderedPngArtifact> = {
				kind: 'test-png-backend',
				supportedFormats: ['png'],
				renderFigure(inputSpec, context) {
					expect(inputSpec).toEqual(original);
					expect(context.widthPx).toBe(spec.widthPx);
					expect(context.heightPx).toBe(spec.heightPx);
					expect(context.dpi).toBe(300);
					expect(context.background).toBe('white');

					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};

			const result = renderFigureSpec(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
			expect(result.widthPx).toBe(spec.widthPx);
			expect(result.heightPx).toBe(spec.heightPx);
			expect(result.dpi).toBe(300);
			expect(spec).toEqual(original);
		});

		it('A2 — derives backend context from the figure spec when execution options are omitted', () => {
			const spec = makeScatterSpec({
				widthPx: 1280,
				heightPx: 720
			});

			let capturedContext: FigureRenderBackendContext | undefined;

			const backend: FigureRenderBackend<RenderedPngArtifact> = {
				kind: 'test-png-backend',
				supportedFormats: ['png'],
				renderFigure(_inputSpec, context) {
					capturedContext = context;
					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};

			const result = renderFigureSpec(spec, backend);

			expect(capturedContext).toEqual({
				widthPx: 1280,
				heightPx: 720,
				dpi: 300,
				background: 'white'
			});

			expect(result.widthPx).toBe(1280);
			expect(result.heightPx).toBe(720);
			expect(result.dpi).toBe(300);
		});

		it('A3 — allows execution options to override default dpi and background deterministically', () => {
			const spec = makeScatterSpec({
				widthPx: 1000,
				heightPx: 500
			});

			let capturedContext: FigureRenderBackendContext | undefined;

			const backend: FigureRenderBackend<RenderedPngArtifact> = {
				kind: 'test-png-backend',
				supportedFormats: ['png'],
				renderFigure(_inputSpec, context) {
					capturedContext = context;
					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};

			renderFigureSpec(spec, backend, {
				dpi: 600,
				background: 'transparent'
			});

			expect(capturedContext).toEqual({
				widthPx: 1000,
				heightPx: 500,
				dpi: 600,
				background: 'transparent'
			});
		});
	});

	describe('B — PNG-Specialized Rendering Helper', () => {
		it('B1 — renders a PNG artifact through a PNG backend', () => {
			const spec = makeScatterSpec({
				widthPx: 1600,
				heightPx: 900
			});

			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure(_inputSpec, context) {
					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi,
						data: Uint8Array.from([1, 2, 3, 4, 5])
					});
				}
			};

			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(result).toEqual({
				format: 'png',
				mimeType: 'image/png',
				widthPx: 1600,
				heightPx: 900,
				dpi: 300,
				data: Uint8Array.from([1, 2, 3, 4, 5])
			});
		});

		it('B2 — preserves deterministic output for identical specs, backend, and options', () => {
			const spec = makeScatterSpec({
				widthPx: 1200,
				heightPx: 800
			});

			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure(inputSpec, context) {
					const seed = [
						inputSpec.widthPx,
						inputSpec.heightPx,
						context.dpi,
						inputSpec.series.length
					].join(':');

					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi,
						data: Uint8Array.from(seed.split('').map((c) => c.charCodeAt(0)))
					});
				}
			};

			const resultA = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(resultA).toEqual(resultB);
		});

		it('B3 — returns PNG bytes and metadata without performing any filesystem writes', () => {
			const spec = makeScatterSpec();

			const backendWriteSpy = vi.fn();

			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure(_inputSpec, context) {
					backendWriteSpy();

					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};

			const result = renderPngFigure(spec, backend);

			expect(backendWriteSpy).toHaveBeenCalledTimes(1);
			expect(result.data).toBeInstanceOf(Uint8Array);
			expect(Array.from(result.data)).toEqual([137, 80, 78, 71]);
		});
	});

	describe('C — Backend Contract Validation', () => {
		it('C1 — throws when a generic backend does not support png rendering', () => {
			const spec = makeScatterSpec();

			const backend: FigureRenderBackend<RenderedPngArtifact> = {
				kind: 'svg-only-test-backend',
				supportedFormats: [],
				renderFigure(_inputSpec, context) {
					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};

			expect(() => renderFigureSpec(spec, backend)).toThrow(
				/does not support required render format/i
			);
		});

		it('C2 — throws when a PNG helper receives a backend that does not declare png support', () => {
			const spec = makeScatterSpec();

			const backend = {
				kind: 'invalid-png-backend',
				supportedFormats: [],
				renderFigure(_inputSpec: FigureRenderSpec, context: FigureRenderBackendContext) {
					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			} as unknown as PngFigureRenderBackend;

			expect(() => renderPngFigure(spec, backend)).toThrow(
				/does not support required render format/i
			);
		});

		it('C3 — throws when a backend returns artifact metadata inconsistent with the execution context', () => {
			const spec = makeScatterSpec({
				widthPx: 1000,
				heightPx: 600
			});

			const backend: PngFigureRenderBackend = {
				kind: 'bad-metadata-backend',
				supportedFormats: ['png'],
				renderFigure(_inputSpec, context) {
					return makeRenderedPngArtifact({
						widthPx: context.widthPx + 1,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};

			expect(() => renderPngFigure(spec, backend)).toThrow(
				/inconsistent rendered artifact metadata/i
			);
		});
	});

	describe('D — Boundary with Step 9A Figure Spec Builders', () => {
		it('D1 — accepts scatter figure specs produced by Step 9A builders', () => {
			const spec = buildScatterFigureSpec(
				{
					points: [
						{ timeMs: 100, amplitudeDeg: 2.1 },
						{ timeMs: 200, amplitudeDeg: 3.4 }
					]
				},
				{
					title: 'Amplitude Scatter'
				}
			);

			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure(_inputSpec, context) {
					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};

			const result = renderPngFigure(spec, backend);

			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
			expect(result.widthPx).toBe(spec.widthPx);
			expect(result.heightPx).toBe(spec.heightPx);
		});

		it('D2 — passes the complete figure spec to the backend unchanged', () => {
			const spec = makeScatterSpec();

			let capturedSpec: FigureRenderSpec | undefined;

			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure(inputSpec, context) {
					capturedSpec = inputSpec;

					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};

			renderPngFigure(spec, backend);

			expect(capturedSpec).toEqual(spec);
		});

		it('D3 — preserves overlay content through the execution boundary', () => {
			const spec = makeScatterSpec({
				overlays: {
					markers: [
						{ timeMs: 250, label: 'Distractor', kind: 'event' },
						{ timeMs: 500, label: 'Segment End', kind: 'boundary' }
					]
				}
			});

			let capturedSpec: FigureRenderSpec | undefined;

			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure(inputSpec, context) {
					capturedSpec = inputSpec;

					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};

			renderPngFigure(spec, backend);

			expect(capturedSpec?.overlays).toEqual({
				markers: [
					{ timeMs: 250, label: 'Distractor', kind: 'event' },
					{ timeMs: 500, label: 'Segment End', kind: 'boundary' }
				]
			});
		});
	});

	describe('E — Boundary with Step 8 Export Writer Expectations', () => {
		it('E1 — returns a PNG artifact shape suitable for export writer consumption', () => {
			const spec = makeScatterSpec({
				widthPx: 1800,
				heightPx: 1200
			});

			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure(_inputSpec, context) {
					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi,
						data: Uint8Array.from([9, 8, 7, 6])
					});
				}
			};

			const result = renderPngFigure(spec, backend, {
				dpi: 600
			});

			expect(result).toEqual({
				format: 'png',
				mimeType: 'image/png',
				widthPx: 1800,
				heightPx: 1200,
				dpi: 600,
				data: Uint8Array.from([9, 8, 7, 6])
			});
		});

		it('E2 — does not inject file paths, filenames, or export descriptors into the rendered artifact', () => {
			const spec = makeScatterSpec();

			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure(_inputSpec, context) {
					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};

			const result = renderPngFigure(spec, backend);

			expect(result).not.toHaveProperty('path');
			expect(result).not.toHaveProperty('relativePath');
			expect(result).not.toHaveProperty('fileName');
			expect(result).not.toHaveProperty('descriptor');
		});

		it('E3 — keeps rendering execution independent from case-bundle and export-writer orchestration concerns', () => {
			const spec = makeScatterSpec();

			const backendSpy = vi.fn(
				(_inputSpec: FigureRenderSpec, context: FigureRenderBackendContext) =>
					makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					})
			);

			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure: backendSpy
			};

			renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			expect(backendSpy).toHaveBeenCalledTimes(1);
			expect(backendSpy.mock.calls[0]?.[0]).toEqual(spec);
			expect(backendSpy.mock.calls[0]?.[1]).toEqual({
				widthPx: spec.widthPx,
				heightPx: spec.heightPx,
				dpi: 300,
				background: 'white'
			});
		});
	});
});

function makeScatterSpec(overrides: Partial<FigureRenderSpec> = {}): FigureRenderSpec {
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
		...overrides
	};
}

function makeRenderedPngArtifact(
	overrides: Partial<RenderedPngArtifact> = {}
): RenderedPngArtifact {
	return {
		format: 'png',
		mimeType: 'image/png',
		widthPx: 1200,
		heightPx: 800,
		dpi: 300,
		data: Uint8Array.from([137, 80, 78, 71]),
		...overrides
	};
}
