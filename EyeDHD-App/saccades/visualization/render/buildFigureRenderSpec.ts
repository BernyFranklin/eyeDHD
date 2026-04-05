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
	const fontFamily = options.publicationDefaults?.fontFamily ?? 'Arial';

	return {
		figureId: options.figureId ?? 'scatter-figure',
		kind: 'scatter',
		dimensions: resolveDimensions(options),
		margins: {
			topPx: 96,
			rightPx: 72,
			bottomPx: 96,
			leftPx: 120
		},
		title: options.title
			? {
					text: options.title,
					font: {
						family: fontFamily,
						sizePt: 16,
						weight: 'bold'
					}
				}
			: undefined,
		xAxis: {
			label: {
				text: options.xAxisLabel ?? 'Time (ms)',
				font: {
					family: fontFamily,
					sizePt: 12
				}
			},
			scaleType: 'linear'
		},
		yAxis: {
			label: {
				text: options.yAxisLabel ?? 'Amplitude (deg)',
				font: {
					family: fontFamily,
					sizePt: 12
				}
			},
			scaleType: 'linear'
		},
		geometry: {
			type: 'scatter',
			series: [
				{
					seriesId: 'scatter-series',
					points: model.points.map((point) => ({
						x: point.timeMs,
						y: point.amplitudeDeg
					}))
				}
			]
		},
		style: {
			background: 'white',
			grid: {
				show: true
			},
			legend: {
				show: false,
				position: 'none'
			}
		},
		metadata: options.metadata
	};
}

export function buildRateSeriesFigureSpec(
	model: { points: Array<{ timeMs: number; ratePerSec: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	const fontFamily = options.publicationDefaults?.fontFamily ?? 'Arial';
	return {
		figureId: options.figureId ?? 'rate-series-figure',
		kind: 'rate-series',
		dimensions: resolveDimensions(options),
		margins: {
			topPx: 96,
			rightPx: 72,
			bottomPx: 96,
			leftPx: 120
		},
		title: options.title
			? {
					text: options.title,
					font: {
						family: fontFamily,
						sizePt: 16,
						weight: 'bold'
					}
				}
			: undefined,
		xAxis: {
			label: {
				text: options.xAxisLabel ?? 'Time (ms)',
				font: {
					family: fontFamily,
					sizePt: 12
				}
			},
			scaleType: 'linear',
			domain: options.axisDomains?.x
		},
		yAxis: {
			label: {
				text: options.yAxisLabel ?? 'Rate (per sec)',
				font: {
					family: fontFamily,
					sizePt: 12
				}
			},
			scaleType: 'linear',
			domain: options.axisDomains?.y
		},
		geometry: {
			type: 'line',
			series: [
				{
					seriesId: 'rate-series',
					points: model.points.map((point) => ({
						x: point.timeMs,
						y: point.ratePerSec
					}))
				}
			]
		},
		style: {
			background: 'white',
			grid: {
				show: true
			},
			legend: {
				show: false,
				position: 'none'
			}
		},
		overlays: options.overlays,
		metadata: options.metadata
	};
}

export function buildIsiHistogramFigureSpec(
	model: { bins: Array<{ binStartMs: number; binEndMs: number; count: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	return {
		figureId: options.figureId ?? 'isi-histogram-figure',
		kind: 'histogram',
		dimensions: {
			widthPx: options.dimensions?.widthPx ?? 1800,
			heightPx: options.dimensions?.heightPx ?? 1200,
			dpi: options.dimensions?.dpi ?? 300
		},
		margins: {
			topPx: 96,
			rightPx: 72,
			bottomPx: 96,
			leftPx: 120
		},
		title: options.title ? { text: options.title } : undefined,
		xAxis: {
			label: { text: options.xAxisLabel ?? 'ISI (ms)' },
			scaleType: 'linear',
			domain: options.axisDomains?.x
		},
		yAxis: {
			label: { text: options.yAxisLabel ?? 'Count' },
			scaleType: 'linear',
			domain: options.axisDomains?.y
		},
		geometry: {
			type: 'histogram',
			bins: model.bins.map((bin) => ({
				binStart: bin.binStartMs,
				binEnd: bin.binEndMs,
				count: bin.count
			}))
		},
		style: {
			background: 'white',
			grid: {
				show: true
			},
			legend: {
				show: false,
				position: 'none'
			}
		},
		metadata: options.metadata
	};
}

export function attachFigureOverlays(
	spec: FigureRenderSpec,
	overlays?: FigureOverlaySpec
): FigureRenderSpec {
	return {
		...spec,
		overlays: overlays
			? {
					markers: overlays.markers,
					segmentBoundaries: overlays.segmentBoundaries
				}
			: undefined
	};
}

export function renderFigureSpec(
	spec: FigureRenderSpec,
	backend: FigureRendererBackend
): RenderedFigureArtifact {
	void spec;
	void backend;
	throw new Error('Not implemented');
}

// Helpers
function resolveDimensions(options: BuildFigureRenderSpecOptions): {
	widthPx: number;
	heightPx: number;
	dpi: number;
} {
	const defaultDims = { widthPx: 1800, heightPx: 1200, dpi: 300 };

	return {
		widthPx:
			options.dimensions?.widthPx ??
			options.publicationDefaults?.dimensions?.widthPx ??
			defaultDims.widthPx,
		heightPx:
			options.dimensions?.heightPx ??
			options.publicationDefaults?.dimensions?.heightPx ??
			defaultDims.heightPx,
		dpi:
			options.dimensions?.dpi ??
			options.publicationDefaults?.dimensions?.dpi ??
			defaultDims.dpi
	};
}
