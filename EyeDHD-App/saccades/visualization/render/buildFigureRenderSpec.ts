import type {
	BuildFigureRenderSpecOptions,
	FigureOverlaySpec,
	FigureRenderSpec,
	FigureRendererBackend,
	RenderedFigureArtifact
} from './types';

export function buildScatterFigureSpec(
	model: { points: Array<{ timeMs: number; amplitudeDeg: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	return {
		figureId: options.figureId ?? 'scatter-figure',
		kind: 'scatter',
		dimensions: {
			widthPx: 1800,
			heightPx: 1200,
			dpi: 300,
		},
		margins: {
			topPx: 96,
			rightPx: 72,
			bottomPx: 96,
			leftPx: 120,
		},
		title: options.title ? { text: options.title } : undefined,
		xAxis: {
			label: {
				text: options.xAxisLabel ?? 'Time (ms)',
			},
			scaleType: 'linear',
		},
		yAxis: {
			label: {
				text: options.yAxisLabel ?? 'Amplitude (deg)',
			},
			scaleType: 'linear',
		},
		geometry: {
			type: 'scatter',
			series: [
				{
					seriesId: 'scatter-series',
					points: model.points.map((point) => ({
						x: point.timeMs,
						y: point.amplitudeDeg,
					})),
				},
			],
		},
		style: {
			background: 'white',
			grid: {
				show: true,
			},
			legend: {
				show: false,
				position: 'none',
			},
		},
		metadata: options.metadata,
	};
}

export function buildRateSeriesFigureSpec(
	model: { points: Array<{ timeMs: number; ratePerSec: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	void model;
	void options;
	throw new Error('Not implemented');
}

export function buildIsiHistogramFigureSpec(
	model: { bins: Array<{ binStartMs: number; binEndMs: number; count: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	void model;
	void options;
	throw new Error('Not implemented');
}

export function attachFigureOverlays(
	spec: FigureRenderSpec,
	overlays?: FigureOverlaySpec
): FigureRenderSpec {
	void spec;
	void overlays;
	throw new Error('Not implemented');
}

export function renderFigureSpec(
	spec: FigureRenderSpec,
	backend: FigureRendererBackend
): RenderedFigureArtifact {
	void spec;
	void backend;
	throw new Error('Not implemented');
}
