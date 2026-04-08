import { describe, expect, it, vi } from 'vitest';

import {
	buildScatterFigureSpec,
	FigureRenderSpec,
	renderFigureSpec,
    renderPngFigure,
} from '@saccades/visualization/render';

import type {
    FigureRenderBackend,
    FigureRenderBackendContext,
    PngFigureRenderBackend,
    RenderedPngArtifact
} from '@saccades/visualization/render/backends/types';

describe('Visualization Rendering Layer — Step 9B PNG Backend Integration', () => {
	describe('A — Generic Backend Execution Boundary', () => {
		it('A1) — Renders a figure spec through an injected backend without mutating the input spec', () => {
			// Generate a scatter figure spec
            const spec = makeScatterSpec();
            // Clone the spec so we can verify it is not mutated
			const original = structuredClone(spec);
            // Inject a test backend that will capture the input spec and context
			const backend: FigureRenderBackend<RenderedPngArtifact> = {
				kind: 'test-png-backend',
				supportedFormats: ['png'],
				renderFigure(inputSpec, context) {
					expect(inputSpec).toEqual(original);
					expect(context.widthPx).toBe(spec.dimensions.widthPx);
					expect(context.heightPx).toBe(spec.dimensions.heightPx);
					expect(context.dpi).toBe(300);
					expect(context.background).toBe('white');

					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					});
				}
			};
            // Pass the spec and backend into the generic renderFigureSpec function with execution options
			const result = renderFigureSpec(spec, backend, {
				dpi: 300,
				background: 'white'
			});
            // Assert that the returned artifact has the expected PNG shape and matches the execution context
			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
			expect(result.widthPx).toBe(spec.dimensions.widthPx);
			expect(result.heightPx).toBe(spec.dimensions.heightPx);
			expect(result.dpi).toBe(300);
			expect(spec).toEqual(original);
		});

		it('A2) — Derives backend context from the figure spec when execution options are omitted', () => {
			// Generate a scatter figure spec with explicit dimensions
			const spec = makeScatterSpec({ widthPx: 1280, heightPx: 720, });

			let capturedContext: FigureRenderBackendContext | undefined;

			// Inject a test backend that captures the context produced by renderFigureSpec
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

			// Call renderFigureSpec without execution options so defaults must be derived
			const result = renderFigureSpec(spec, backend);

			// Assert the derived context uses the spec's dimensions and default dpi/background
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

		it('A3) — Allows execution options to override default dpi and background deterministically', () => {
			// Generate a scatter figure spec with explicit dimensions
			const spec = makeScatterSpec({ widthPx: 1000, heightPx: 500, });

			let capturedContext: FigureRenderBackendContext | undefined;

			// Inject a test backend that captures the context handed to it
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

			// Call renderFigureSpec with explicit overrides for dpi and background
			renderFigureSpec(spec, backend, {
				dpi: 600,
				background: 'transparent'
			});

			// Assert that the captured context reflects the overridden dpi and background
			expect(capturedContext).toEqual({
				widthPx: 1000,
				heightPx: 500,
				dpi: 600,
				background: 'transparent'
			});
		});
	});

	describe('B — PNG-Specialized Rendering Helper', () => {
		it('B1) — Renders a PNG artifact through a PNG backend', () => {
			// Generate a scatter figure spec with explicit dimensions
			const spec = makeScatterSpec({ widthPx: 1600, heightPx: 900, });

			// Inject a PNG backend that returns a fixed byte payload
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

			// Call the PNG-specialized helper with explicit execution options
			const result = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			// Assert the resulting artifact matches the expected PNG shape and bytes
			expect(result).toEqual({
				format: 'png',
				mimeType: 'image/png',
				widthPx: 1600,
				heightPx: 900,
				dpi: 300,
				data: Uint8Array.from([1, 2, 3, 4, 5])
			});
		});

		it('B2) — Preserves deterministic output for identical specs, backend, and options', () => {
			// Generate a scatter figure spec with explicit dimensions
			const spec = makeScatterSpec({ widthPx: 1200, heightPx: 800, });

			// Inject a PNG backend that derives its byte payload deterministically from the inputs
			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure(inputSpec, context) {
					const seed = [
						inputSpec.dimensions.widthPx,
						inputSpec.dimensions.heightPx,
						context.dpi,
						inputSpec.title?.text ?? '',
                        inputSpec.geometry.type,
					].join(':');

					return makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi,
						data: Uint8Array.from(seed.split('').map((c) => c.charCodeAt(0)))
					});
				}
			};

			// Render the same spec twice with identical options
			const resultA = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			const resultB = renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});

			// Assert both renders produced identical artifacts
			expect(resultA).toEqual(resultB);
		});

		it('B3) — Returns PNG bytes and metadata without performing any filesystem writes', () => {
			// Generate a default scatter figure spec
			const spec = makeScatterSpec();

			// Spy that will be invoked from inside the backend to confirm it ran exactly once
			const backendWriteSpy = vi.fn();

			// Inject a PNG backend that calls the spy and returns a default PNG artifact
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

			// Call the PNG-specialized helper without execution options
			const result = renderPngFigure(spec, backend);

			// Assert the backend ran exactly once and the result is in-memory PNG bytes
			expect(backendWriteSpy).toHaveBeenCalledTimes(1);
			expect(result.data).toBeInstanceOf(Uint8Array);
			expect(Array.from(result.data)).toEqual([137, 80, 78, 71]);
		});
	});

	describe('C — Backend Contract Validation', () => {
		it('C1) — Throws when a generic backend does not support png rendering', () => {
			// Generate a default scatter figure spec
			const spec = makeScatterSpec();

			// Inject a backend that declares no supported formats
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

			// Assert that renderFigureSpec rejects the backend at the contract boundary
			expect(() => renderFigureSpec(spec, backend)).toThrow(
				/does not support required render format/i
			);
		});

		it('C2) — Throws when a PNG helper receives a backend that does not declare png support', () => {
			// Generate a default scatter figure spec
			const spec = makeScatterSpec();

			// Build a backend that lies about being a PngFigureRenderBackend (no png in supportedFormats)
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

			// Assert that the PNG helper rejects the backend at the contract boundary
			expect(() => renderPngFigure(spec, backend)).toThrow(
				/does not support required render format/i
			);
		});

		it('C3) — Throws when a backend returns artifact metadata inconsistent with the execution context', () => {
			// Generate a scatter figure spec with explicit dimensions
			const spec = makeScatterSpec({
				widthPx: 1000,
				heightPx: 600
			});

			// Inject a PNG backend that returns a width that does not match the execution context
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

			// Assert that the helper detects the metadata mismatch and throws
			expect(() => renderPngFigure(spec, backend)).toThrow(
				/inconsistent rendered artifact metadata/i
			);
		});
	});

	describe('D — Boundary with Step 9A Figure Spec Builders', () => {
		it('D1) — Accepts scatter figure specs produced by Step 9A builders', () => {
			// Build a scatter figure spec directly from the Step 9A builder
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

			// Inject a PNG backend that echoes the execution context dimensions
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

			// Render the builder-produced spec through the PNG helper
			const result = renderPngFigure(spec, backend);

			// Assert the artifact carries PNG metadata matching the spec dimensions
			expect(result.format).toBe('png');
			expect(result.mimeType).toBe('image/png');
			expect(result.widthPx).toBe(spec.dimensions.widthPx);
			expect(result.heightPx).toBe(spec.dimensions.heightPx);
		});

		it('D2) — Passes the complete figure spec to the backend unchanged', () => {
			// Generate a default scatter figure spec
			const spec = makeScatterSpec();

			let capturedSpec: FigureRenderSpec | undefined;

			// Inject a PNG backend that captures the spec it receives
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

			// Render through the PNG helper
			renderPngFigure(spec, backend);

			// Assert the backend received the exact same spec object the caller passed in
			expect(capturedSpec).toEqual(spec);
		});

		it('D3) — Preserves overlay content through the execution boundary', () => {
			// Generate a scatter figure spec carrying overlay markers
			const spec = makeScatterSpec({
				overlays: {
					markers: [
						{ timeMs: 250, label: 'Distractor', kind: 'event' },
						{ timeMs: 500, label: 'Segment End', kind: 'boundary' }
					]
				}
			});

			let capturedSpec: FigureRenderSpec | undefined;

			// Inject a PNG backend that captures the spec for overlay inspection
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

			// Render through the PNG helper
			renderPngFigure(spec, backend);

			// Assert that overlay markers passed through the boundary unchanged
			expect(capturedSpec?.overlays).toEqual({
				markers: [
					{ timeMs: 250, label: 'Distractor', kind: 'event' },
					{ timeMs: 500, label: 'Segment End', kind: 'boundary' }
				]
			});
		});
	});

	describe('E — Boundary with Step 8 Export Writer Expectations', () => {
		it('E1) — Returns a PNG artifact shape suitable for export writer consumption', () => {
			// Generate a scatter figure spec sized for an export-quality render
			const spec = makeScatterSpec({
				widthPx: 1800,
				heightPx: 1200
			});
			// Inject a PNG backend that returns a fixed byte payload
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
			// Render at high dpi through the PNG helper
			const result = renderPngFigure(spec, backend, {
				dpi: 600
			});
			// Assert the artifact exposes exactly the fields an export writer expects
			expect(result).toEqual({
				format: 'png',
				mimeType: 'image/png',
				widthPx: 1800,
				heightPx: 1200,
				dpi: 600,
				data: Uint8Array.from([9, 8, 7, 6])
			});
		});

		it('E2) — Does not inject file paths, filenames, or export descriptors into the rendered artifact', () => {
			// Generate a default scatter figure spec
			const spec = makeScatterSpec();
			// Inject a PNG backend that returns a default PNG artifact
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
			// Render through the PNG helper
			const result = renderPngFigure(spec, backend);
			// Assert no export-writer concerns leaked into the artifact shape
			expect(result).not.toHaveProperty('path');
			expect(result).not.toHaveProperty('relativePath');
			expect(result).not.toHaveProperty('fileName');
			expect(result).not.toHaveProperty('descriptor');
		});

		it('E3) — Keeps rendering execution independent from case-bundle and export-writer orchestration concerns', () => {
			// Generate a default scatter figure spec
			const spec = makeScatterSpec();
			// Spy that wraps the backend renderFigure call so we can inspect its invocation
			const backendSpy = vi.fn(
				(_inputSpec: FigureRenderSpec, context: FigureRenderBackendContext) =>
					makeRenderedPngArtifact({
						widthPx: context.widthPx,
						heightPx: context.heightPx,
						dpi: context.dpi
					})
			);
			// Inject a PNG backend whose renderFigure is the spy
			const backend: PngFigureRenderBackend = {
				kind: 'png-test-backend',
				supportedFormats: ['png'],
				renderFigure: backendSpy
			};
			// Render through the PNG helper with explicit execution options
			renderPngFigure(spec, backend, {
				dpi: 300,
				background: 'white'
			});
			// Assert the backend was invoked exactly once with only the spec and the execution context
			expect(backendSpy).toHaveBeenCalledTimes(1);
			expect(backendSpy.mock.calls[0]?.[0]).toEqual(spec);
			expect(backendSpy.mock.calls[0]?.[1]).toEqual({
				widthPx: spec.dimensions.widthPx,
				heightPx: spec.dimensions.heightPx,
				dpi: 300,
				background: 'white'
			});
		});
	});
});

// Helpers
function makeScatterSpec(options?: {
	widthPx?: number;
	heightPx?: number;
	overlays?: FigureRenderSpec['overlays'];
}): FigureRenderSpec {
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
