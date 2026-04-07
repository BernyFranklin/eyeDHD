// saccades/render/buildFigureRenderSpec.test.ts

import { describe, expect, it } from 'vitest';

import {
	attachFigureOverlays,
	buildIsiHistogramFigureSpec,
	buildRateSeriesFigureSpec,
	buildScatterFigureSpec,
	renderFigureSpec
} from '@saccades/visualization/render/buildFigureRenderSpec';

import type {
	FigureRenderSpec,
	FigureRendererBackend,
	MarkerOverlaySpec,
	PublicationFigureDefaults,
	RenderedFigureArtifact
} from '@saccades/visualization/render/types';

describe('Visualization Rendering Layer', () => {
	describe('A — Scatter Figure Spec Construction', () => {
		it('A1) — Builds a deterministic scatter figure spec from scatter model points', () => {
			// Create scatter model
			const model = makeScatterModel();
			// Build scatter figure spec
			const result = buildScatterFigureSpec(model);
			// Assert scatter figure spec properties
			expect(result.figureId).toBe('scatter-figure');
			expect(result.kind).toBe('scatter');
			expect(result.geometry.type).toBe('scatter');

			// Guard for TS compiler, prevents assuming result.geometry is scatter
			if (result.geometry.type !== 'scatter') {
				throw new Error('Expected scatter geometry');
			}
			// Assert scatter series points
			expect(result.geometry.series).toHaveLength(1);
			expect(result.geometry.series[0]?.points).toEqual([
				{ x: 100, y: 2.5 },
				{ x: 250, y: 4.25 },
				{ x: 500, y: 3.75 }
			]);
			// Assert axis labels
			expect(result.xAxis.label.text).toBe('Time (ms)');
			expect(result.yAxis.label.text).toBe('Amplitude (deg)');
		});

		it('A2) — Applies publication-ready defaults when explicit options are not provided', () => {
			// Build scatter figure spec without providing explicit options
			const model = makeScatterModel();
			// Build scatter figure spec without providing explicit options
			const result = buildScatterFigureSpec(model);
			// Assert that publication defaults are applied
			expect(result.dimensions).toEqual({
				widthPx: 1800,
				heightPx: 1200,
				dpi: 300
			});
			// Assert that publication defaults are applied for margins
			expect(result.margins).toEqual({
				topPx: 96,
				rightPx: 72,
				bottomPx: 96,
				leftPx: 120
			});
			// Assert that publication defaults are applied for style
			expect(result.style.background).toBe('white');
			expect(result.style.grid.show).toBe(true);
			expect(result.style.legend.show).toBe(false);
			expect(result.xAxis.scaleType).toBe('linear');
			expect(result.yAxis.scaleType).toBe('linear');
		});

		it('A3) — Honors explicit scatter figure metadata and label overrides', () => {
			// Create scatter model
			const model = makeScatterModel();
			// Build scatter figure spec with explicit options
			const result = buildScatterFigureSpec(model, {
				figureId: 'custom-scatter',
				title: 'Saccade Amplitude Scatter',
				xAxisLabel: 'Elapsed Time (ms)',
				yAxisLabel: 'Amplitude Degrees',
				metadata: {
					participantId: 'P-001'
				}
			});
			// Assert that explicit options are honored in the resulting figure spec
			expect(result.figureId).toBe('custom-scatter');
			expect(result.title?.text).toBe('Saccade Amplitude Scatter');
			expect(result.xAxis.label.text).toBe('Elapsed Time (ms)');
			expect(result.yAxis.label.text).toBe('Amplitude Degrees');
			expect(result.metadata).toEqual({
				participantId: 'P-001'
			});
		});

		it('A4) — Does not mutate the input scatter model', () => {
			// Create scatter model
			const model = makeScatterModel();
			// Clone the original model to compare after building the figure spec
			const original = structuredClone(model);
			// Build scatter figure spec
			buildScatterFigureSpec(model);
			// Assert that the input model was not mutated
			expect(model).toEqual(original);
		});
	});

	describe('B — Rate Series Figure Spec Construction', () => {
		it('B1) — Builds a deterministic line figure spec from rate series points', () => {
			// Create rate series model
			const model = makeRateSeriesModel();
			// Build rate series figure spec
			const result = buildRateSeriesFigureSpec(model);
			// Assert that the resulting figure spec has the expected properties
			expect(result.figureId).toBe('rate-series-figure');
			expect(result.kind).toBe('rate-series');
			expect(result.geometry.type).toBe('line');

			// Guard for TS compiler, prevents assuming result.geometry is line
			if (result.geometry.type !== 'line') {
				throw new Error('Expected line geometry');
			}
			// Assert that the line series has the expected points
			expect(result.geometry.series).toHaveLength(1);
			expect(result.geometry.series[0]?.points).toEqual([
				{ x: 0, y: 1.25 },
				{ x: 1000, y: 2.0 },
				{ x: 2000, y: 1.5 }
			]);
			// Assert that the axis labels are as expected
			expect(result.xAxis.label.text).toBe('Time (ms)');
			expect(result.yAxis.label.text).toBe('Rate (per sec)');
		});

		it('B2) — Preserves input ordering rather than resorting rate series points', () => {
			// Create rate series model with out-of-order points
			const model = {
				points: [
					{ timeMs: 2000, ratePerSec: 1.5 },
					{ timeMs: 0, ratePerSec: 1.25 },
					{ timeMs: 1000, ratePerSec: 2.0 }
				]
			};
			// Build rate series figure spec
			const result = buildRateSeriesFigureSpec(model);
			// Assert that the geometry type is line
			expect(result.geometry.type).toBe('line');

			// Guard for TS compiler, prevents assuming result.geometry is line
			if (result.geometry.type !== 'line') {
				throw new Error('Expected line geometry');
			}
			// Assert that the series points preserve the input ordering
			expect(result.geometry.series[0]?.points).toEqual([
				{ x: 2000, y: 1.5 },
				{ x: 0, y: 1.25 },
				{ x: 1000, y: 2.0 }
			]);
		});

		it('B3) — Supports explicit axis domain overrides for stable publication scaling', () => {
			// Create rate series model
			const model = makeRateSeriesModel();
			// Build rate series figure spec with explicit axis domain overrides
			const result = buildRateSeriesFigureSpec(model, {
				axisDomains: {
					x: { min: 0, max: 3000 },
					y: { min: 0, max: 3 }
				}
			});
			// Assert that the axis domains are set as specified
			expect(result.xAxis.domain).toEqual({ min: 0, max: 3000 });
			expect(result.yAxis.domain).toEqual({ min: 0, max: 3 });
		});

		it('B4) — Does not mutate the input rate series model', () => {
			// Create rate series model
			const model = makeRateSeriesModel();
			// Clone the original model to compare after building the figure spec
			const original = structuredClone(model);
			// Build rate series figure spec
			buildRateSeriesFigureSpec(model);
			// Assert that the input model was not mutated
			expect(model).toEqual(original);
		});
	});

	describe('C — ISI Histogram Figure Spec Construction', () => {
		it('C1) — Builds a deterministic histogram figure spec from histogram bins', () => {
			// Create ISI histogram model
			const model = makeIsiHistogramModel();
			// Build ISI histogram figure spec
			const result = buildIsiHistogramFigureSpec(model);
			// Assert that the figure spec has the expected top-level properties
			expect(result.figureId).toBe('isi-histogram-figure');
			expect(result.kind).toBe('histogram');
			expect(result.geometry.type).toBe('histogram');

			// Guard for TS compiler, prevents assuming result.geometry is histogram
			if (result.geometry.type !== 'histogram') {
				throw new Error('Expected histogram geometry');
			}
			// Assert that the histogram bins are as expected
			expect(result.geometry.bins).toEqual([
				{ binStart: 0, binEnd: 50, count: 2 },
				{ binStart: 50, binEnd: 100, count: 5 },
				{ binStart: 100, binEnd: 150, count: 1 }
			]);
			// Assert that the axis labels are as expected
			expect(result.xAxis.label.text).toBe('ISI (ms)');
			expect(result.yAxis.label.text).toBe('Count');
		});

		it('C2) — Preserves provided bin boundaries exactly for downstream deterministic rendering', () => {
			// Create ISI histogram model with non-standard bin boundaries
			const model = {
				bins: [
					{ binStartMs: 0, binEndMs: 37.5, count: 1 },
					{ binStartMs: 37.5, binEndMs: 75, count: 4 }
				]
			};
			// Build ISI histogram figure spec
			const result = buildIsiHistogramFigureSpec(model);
			// Assert that the geometry type is histogram
			expect(result.geometry.type).toBe('histogram');

			// Guard for TS compiler, prevents assuming result.geometry is histogram
			if (result.geometry.type !== 'histogram') {
				throw new Error('Expected histogram geometry');
			}
			// Assert that the histogram bins preserve the input bin boundaries exactly
			expect(result.geometry.bins).toEqual([
				{ binStart: 0, binEnd: 37.5, count: 1 },
				{ binStart: 37.5, binEnd: 75, count: 4 }
			]);
		});

		it('C3) — Supports explicit titles and dimensions for publication variants', () => {
			// Create ISI histogram model
			const model = makeIsiHistogramModel();
			// Build ISI histogram figure spec with explicit title and dimensions
			const result = buildIsiHistogramFigureSpec(model, {
				title: 'Inter-Saccadic Interval Distribution',
				dimensions: {
					widthPx: 2400,
					heightPx: 1600,
					dpi: 600
				}
			});
			// Assert that the title and dimensions are set as specified
			expect(result.title?.text).toBe('Inter-Saccadic Interval Distribution');
			expect(result.dimensions).toEqual({
				widthPx: 2400,
				heightPx: 1600,
				dpi: 600
			});
		});

		it('C4) — Does not mutate the input histogram model', () => {
			// Create ISI histogram model
			const model = makeIsiHistogramModel();
			// Clone the original model to compare after building the figure spec
			const original = structuredClone(model);
			// Build ISI histogram figure spec
			buildIsiHistogramFigureSpec(model);
			// Assert that the input model has not been mutated
			expect(model).toEqual(original);
		});
	});

	describe('D — Overlay Attachment and Marker Support', () => {
		it('D1) — Attaches marker overlays without altering geometry', () => {
			// Build a base scatter figure spec
			const base = buildScatterFigureSpec(makeScatterModel());
			// Attach marker overlays to the base figure spec
			const result = attachFigureOverlays(base, {
				markers: [
					{ timeMs: 125, label: 'Distractor A', kind: 'distractor' },
					{ timeMs: 400, label: 'Segment Start', kind: 'segment-boundary' }
				]
			});
			// Assert that the geometry remains unchanged and the overlays are attached as expected
			expect(result.geometry).toEqual(base.geometry);
			expect(result.overlays?.markers).toEqual([
				{ timeMs: 125, label: 'Distractor A', kind: 'distractor' },
				{ timeMs: 400, label: 'Segment Start', kind: 'segment-boundary' }
			]);
		});

		it('D2) — Supports segment boundary overlays alongside marker overlays', () => {
			// Build a base rate series figure spec
			const base = buildRateSeriesFigureSpec(makeRateSeriesModel());
			// Attach segment boundary overlays alongside marker overlays to the base figure spec
			const result = attachFigureOverlays(base, {
				markers: [{ timeMs: 900, label: 'Cue', kind: 'event' }],
				segmentBoundaries: [
					{ timeMs: 0, label: 'Baseline' },
					{ timeMs: 1000, label: 'Task' }
				]
			});
			// Assert that the overlays are attached as expected
			expect(result.overlays).toEqual({
				markers: [{ timeMs: 900, label: 'Cue', kind: 'event' }],
				segmentBoundaries: [
					{ timeMs: 0, label: 'Baseline' },
					{ timeMs: 1000, label: 'Task' }
				]
			});
		});

		it('D3) — Returns a new figure spec rather than mutating the original when overlays are attached', () => {
			// Build a base scatter figure spec
			const base = buildScatterFigureSpec(makeScatterModel());
			// Clone the original figure spec to compare after attaching overlays
			const original = structuredClone(base);
			// Attach overlays to the base figure spec
			const result = attachFigureOverlays(base, {
				markers: [{ timeMs: 123, label: 'Event', kind: 'event' }]
			});
			// Assert that the original figure spec has not been mutated and that a new figure spec is returned with the overlays attached
			expect(base).toEqual(original);
			expect(result).not.toBe(base);
			expect(result.overlays?.markers).toEqual([
				{ timeMs: 123, label: 'Event', kind: 'event' }
			]);
		});

		it('D4) — Preserves marker ordering as provided for deterministic downstream rendering', () => {
			// Build a base scatter figure spec
			const base = buildScatterFigureSpec(makeScatterModel());
			// Define marker overlays in a specific order
			const markers: MarkerOverlaySpec[] = [
				{ timeMs: 800, label: 'Later', kind: 'event' },
				{ timeMs: 100, label: 'Earlier', kind: 'event' }
			];
			// Attach the marker overlays to the base figure spec
			const result = attachFigureOverlays(base, { markers });
			// Assert that the marker ordering is preserved as provided
			expect(result.overlays?.markers).toEqual([
				{ timeMs: 800, label: 'Later', kind: 'event' },
				{ timeMs: 100, label: 'Earlier', kind: 'event' }
			]);
		});
	});

	describe('E — Publication Defaults and Stable Rendering Metadata', () => {
		it('E1) — Supports publication default overrides while preserving unspecified defaults', () => {
			// Build a scatter model to use as the base for the figure spec
			const model = makeScatterModel();
			// Define publication defaults to override certain figure spec defaults
			const publicationDefaults: Partial<PublicationFigureDefaults> = {
				dimensions: {
					widthPx: 2000,
					heightPx: 1400,
					dpi: 300
				},
				fontFamily: 'Arial'
			};
			// Build the figure spec using the scatter model and the publication defaults
			const result = buildScatterFigureSpec(model, {
				publicationDefaults
			});
			// Assert that the figure spec dimensions reflect the publication defaults
			expect(result.dimensions).toEqual({
				widthPx: 2000,
				heightPx: 1400,
				dpi: 300
			});
			// Assert that the figure spec font family reflects the publication defaults
			expect(result.title?.font?.family ?? 'Arial').toBe('Arial');
			expect(result.xAxis.label.font?.family ?? 'Arial').toBe('Arial');
			expect(result.yAxis.label.font?.family ?? 'Arial').toBe('Arial');
			// Assert that the figure spec margins reflect the default values
			expect(result.margins).toEqual({
				topPx: 96,
				rightPx: 72,
				bottomPx: 96,
				leftPx: 120
			});
		});

		it('E2) — Allows explicit dimension overrides to take precedence over publication defaults', () => {
			// Build a rate series model to use as the base for the figure spec
			const model = makeRateSeriesModel();
			// Build the figure spec using the rate series model with both publication defaults and explicit dimension overrides
			const result = buildRateSeriesFigureSpec(model, {
				publicationDefaults: {
					dimensions: {
						widthPx: 1800,
						heightPx: 1200,
						dpi: 300
					}
				},
				dimensions: {
					widthPx: 2400,
					heightPx: 1600,
					dpi: 600
				}
			});
			// Assert that the figure spec dimensions reflect the explicit overrides rather than the publication defaults
			expect(result.dimensions).toEqual({
				widthPx: 2400,
				heightPx: 1600,
				dpi: 600
			});
		});

		it('E3) — Includes stable default title and label font sizing suitable for publication output', () => {
			// Build a scatter model to use as the base for the figure spec
			const model = makeScatterModel();
			// Build the figure spec using the scatter model with a title to test default font sizing
			const result = buildScatterFigureSpec(model, {
				title: 'Amplitude Scatter'
			});
			// Assert that the title font reflects the default publication sizing
			expect(result.title?.font).toEqual({
				family: 'Arial',
				sizePt: 16,
				weight: 'bold'
			});
			// Assert that the x-axis label font reflects the default publication sizing
			expect(result.xAxis.label.font).toEqual({
				family: 'Arial',
				sizePt: 12
			});
			// Assert that the y-axis label font reflects the default publication sizing
			expect(result.yAxis.label.font).toEqual({
				family: 'Arial',
				sizePt: 12
			});
		});

		it('E4) — Keeps axis scale types stable and linear by default', () => {
			// Build scatter, rate series, and histogram figure specs to test that axis scale types default to linear
			const scatter = buildScatterFigureSpec(makeScatterModel());
			const rate = buildRateSeriesFigureSpec(makeRateSeriesModel());
			const histogram = buildIsiHistogramFigureSpec(makeIsiHistogramModel());
			// Assert that all figure specs have linear scale types for both axes by default
			expect(scatter.xAxis.scaleType).toBe('linear');
			expect(scatter.yAxis.scaleType).toBe('linear');
			expect(rate.xAxis.scaleType).toBe('linear');
			expect(rate.yAxis.scaleType).toBe('linear');
			expect(histogram.xAxis.scaleType).toBe('linear');
			expect(histogram.yAxis.scaleType).toBe('linear');
		});
	});

	describe('F — Renderer Backend Boundary', () => {
		it('F1) — Passes the exact figure spec to the renderer backend and returns the rendered artifact', () => {
			// Build a scatter figure spec with a figure ID to pass to the renderer backend
			const spec = buildScatterFigureSpec(makeScatterModel(), {
				figureId: 'render-me'
			});
			// Track calls made to the backend to verify that the exact figure spec is passed
			const calls: FigureRenderSpec[] = [];
			const backend = makeBackend((incoming) => {
				calls.push(incoming);
				return makeRenderedArtifact({
					figureId: incoming.figureId,
					widthPx: incoming.dimensions.widthPx,
					heightPx: incoming.dimensions.heightPx,
					dpi: incoming.dimensions.dpi
				});
			});
			// Render the figure spec using the backend and capture the returned rendered artifact
			const result = renderFigureSpec(spec, backend);
			// Assert that the backend was called exactly once with the figure spec and that the returned artifact matches expectations
			expect(calls).toHaveLength(1);
			expect(calls[0]).toEqual(spec);
			expect(result).toEqual({
				figureId: 'render-me',
				format: 'png',
				widthPx: spec.dimensions.widthPx,
				heightPx: spec.dimensions.heightPx,
				dpi: spec.dimensions.dpi,
				bytes: new Uint8Array([1, 2, 3, 4]),
				metadata: {}
			});
		});

		it('F2) — Does not mutate the provided figure spec during backend rendering', () => {
			// Build a rate series figure spec and make a deep copy to verify that it is not mutated by the backend
			const spec = buildRateSeriesFigureSpec(makeRateSeriesModel());
			const original = structuredClone(spec);
			// Create a backend that simply returns a rendered artifact without modifying the incoming spec
			const backend = makeBackend((incoming) =>
				makeRenderedArtifact({
					figureId: incoming.figureId,
					widthPx: incoming.dimensions.widthPx,
					heightPx: incoming.dimensions.heightPx,
					dpi: incoming.dimensions.dpi
				})
			);
			// Render the figure spec using the backend
			renderFigureSpec(spec, backend);
			// Assert that the figure spec has not been mutated by the backend
			expect(spec).toEqual(original);
		});

		it('F3) — Supports deterministic repeated rendering with the same backend and same input', () => {
			// Build an ISI histogram figure spec to test repeated rendering determinism
			const spec = buildIsiHistogramFigureSpec(makeIsiHistogramModel());
			// Create a backend that returns a rendered artifact for the incoming figure spec
			const backend = makeBackend((incoming) =>
				makeRenderedArtifact({
					figureId: incoming.figureId,
					widthPx: incoming.dimensions.widthPx,
					heightPx: incoming.dimensions.heightPx,
					dpi: incoming.dimensions.dpi
				})
			);
			// Render the figure spec twice using the same backend to verify deterministic output
			const resultA = renderFigureSpec(spec, backend);
			const resultB = renderFigureSpec(spec, backend);
			// Assert that repeated rendering with the same backend and same input produces identical rendered artifacts
			expect(resultA).toEqual(resultB);
		});
	});

	describe('G — End-to-End Figure Spec Determinism', () => {
		it('G1) — Produces identical scatter figure specs for identical inputs', () => {
			// Build a scatter model to use as input for building figure specs
			const model = makeScatterModel();
			// Build two identical scatter figure specs from the same model and identical options
			const resultA = buildScatterFigureSpec(model, {
				title: 'Scatter',
				overlays: {
					markers: [{ timeMs: 200, label: 'Event', kind: 'event' }]
				}
			});

			const resultB = buildScatterFigureSpec(model, {
				title: 'Scatter',
				overlays: {
					markers: [{ timeMs: 200, label: 'Event', kind: 'event' }]
				}
			});
			// Assert that the two figure specs are identical
			expect(resultA).toEqual(resultB);
		});

		it('G2) — Produces identical histogram figure specs for identical inputs and explicit domains', () => {
			// Build an ISI histogram model to use as input for building figure specs
			const model = makeIsiHistogramModel();
			// Build a histogram figure spec from the model with explicit axis domains
			const resultA = buildIsiHistogramFigureSpec(model, {
				axisDomains: {
					x: { min: 0, max: 200 },
					y: { min: 0, max: 10 }
				}
			});
			// Build a second histogram figure spec from the same model with identical explicit axis domains
			const resultB = buildIsiHistogramFigureSpec(model, {
				axisDomains: {
					x: { min: 0, max: 200 },
					y: { min: 0, max: 10 }
				}
			});
			// Assert that the two histogram figure specs are identical
			expect(resultA).toEqual(resultB);
		});

		it('G3) — Supports overlays supplied directly at figure-build time', () => {
			// Build a rate series model to use as input for building a figure spec with overlays
			const model = makeRateSeriesModel();
			// Build a figure spec from the model with overlays supplied directly at figure-build time
			const result = buildRateSeriesFigureSpec(model, {
				overlays: {
					markers: [{ timeMs: 1000, label: 'Probe', kind: 'probe' }],
					segmentBoundaries: [{ timeMs: 0, label: 'Start' }]
				}
			});
			// Assert that the overlays supplied at figure-build time are present in the resulting figure spec
			expect(result.overlays).toEqual({
				markers: [{ timeMs: 1000, label: 'Probe', kind: 'probe' }],
				segmentBoundaries: [{ timeMs: 0, label: 'Start' }]
			});
		});

		it('G4) — Keeps rendering concerns separate from file writing by returning in-memory artifacts only', () => {
			// Build a scatter figure spec to test that rendering returns in-memory artifacts only without writing to disk
			const spec = buildScatterFigureSpec(makeScatterModel());
			// Create a backend that returns a rendered artifact for the incoming figure spec without writing to disk
			const backend = makeBackend((incoming) =>
				makeRenderedArtifact({
					figureId: incoming.figureId,
					widthPx: incoming.dimensions.widthPx,
					heightPx: incoming.dimensions.heightPx,
					dpi: incoming.dimensions.dpi,
					metadata: {
						title: incoming.title?.text ?? null
					}
				})
			);
			// Render the figure spec using the backend that returns in-memory artifacts only
			const result = renderFigureSpec(spec, backend);
			// Assert that the rendered artifact returned by the backend contains the expected in-memory properties without writing to disk
			expect(result.format).toBe('png');
			expect(result.bytes).toBeInstanceOf(Uint8Array);
			expect(result.metadata).toEqual({
				title: spec.title?.text ?? null
			});
		});
	});
});

/* ------------------------------ Helpers ------------------------------ */

function makeScatterModel() {
	return {
		points: [
			{ timeMs: 100, amplitudeDeg: 2.5 },
			{ timeMs: 250, amplitudeDeg: 4.25 },
			{ timeMs: 500, amplitudeDeg: 3.75 }
		]
	};
}

function makeRateSeriesModel() {
	return {
		points: [
			{ timeMs: 0, ratePerSec: 1.25 },
			{ timeMs: 1000, ratePerSec: 2.0 },
			{ timeMs: 2000, ratePerSec: 1.5 }
		]
	};
}

function makeIsiHistogramModel() {
	return {
		bins: [
			{ binStartMs: 0, binEndMs: 50, count: 2 },
			{ binStartMs: 50, binEndMs: 100, count: 5 },
			{ binStartMs: 100, binEndMs: 150, count: 1 }
		]
	};
}

function makeBackend(
	impl: (spec: FigureRenderSpec) => RenderedFigureArtifact
): FigureRendererBackend {
	return {
		render(spec: FigureRenderSpec) {
			return impl(spec);
		}
	};
}

function makeRenderedArtifact(
	overrides: Partial<RenderedFigureArtifact> = {}
): RenderedFigureArtifact {
	return {
		figureId: overrides.figureId ?? 'figure-1',
		format: 'png',
		widthPx: overrides.widthPx ?? 1800,
		heightPx: overrides.heightPx ?? 1200,
		dpi: overrides.dpi ?? 300,
		bytes: overrides.bytes ?? new Uint8Array([1, 2, 3, 4]),
		metadata: overrides.metadata ?? {}
	};
}
