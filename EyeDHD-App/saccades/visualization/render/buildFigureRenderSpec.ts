import type {
	BuildFigureRenderSpecOptions,
	FigureOverlaySpec,
	FigureRenderSpec,
	FigureRendererBackend,
	RenderedFigureArtifact
} from './types';

import {
	buildAxisLabelSpec,
	buildBaseFigureSpec,
	buildTitleSpec,
	cloneOverlays,
	resolveFontFamily
} from './helpers';


export function buildScatterFigureSpec(
	model: { points: Array<{ timeMs: number; amplitudeDeg: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	const fontFamily = resolveFontFamily(options);

	return buildBaseFigureSpec({
		figureId: options.figureId ?? 'scatter-figure',
		kind: 'scatter',
		options,
		defaultXAxisLabel: 'Time (ms)',
		defaultYAxisLabel: 'Amplitude (deg)',
		title: buildTitleSpec(options.title, fontFamily),
		xAxis: {
			label: buildAxisLabelSpec(options.xAxisLabel ?? 'Time (ms)', fontFamily),
			scaleType: 'linear'
		},
		yAxis: {
			label: buildAxisLabelSpec(options.yAxisLabel ?? 'Amplitude (deg)', fontFamily),
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
		}
	});
}

export function buildRateSeriesFigureSpec(
	model: { points: Array<{ timeMs: number; ratePerSec: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	const fontFamily = options.publicationDefaults?.fontFamily ?? 'Arial';
	return buildBaseFigureSpec({
		figureId: options.figureId ?? 'rate-series-figure',
		kind: 'rate-series',
		options,
		defaultXAxisLabel: 'Time (ms)',
		defaultYAxisLabel: 'Rate (per sec)',
		title: buildTitleSpec(options.title, fontFamily),
		xAxis: {
			label: buildAxisLabelSpec(options.xAxisLabel ?? 'Time (ms)', fontFamily),
			scaleType: 'linear',
			domain: options.axisDomains?.x
		},
		yAxis: {
			label: buildAxisLabelSpec(options.yAxisLabel ?? 'Rate (per sec)', fontFamily),
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
		}
	});
}

export function buildIsiHistogramFigureSpec(
	model: { bins: Array<{ binStartMs: number; binEndMs: number; count: number }> },
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
		const fontFamily = resolveFontFamily(options);
	return buildBaseFigureSpec({
		figureId: options.figureId ?? 'isi-histogram-figure',
		kind: 'histogram',
		options,
		defaultXAxisLabel: 'ISI (ms)',
		defaultYAxisLabel: 'Count',
		title: buildTitleSpec(options.title, fontFamily),
		xAxis: {
			label: buildAxisLabelSpec(options.xAxisLabel ?? 'ISI (ms)', fontFamily),
			domain: options.axisDomains?.x
		},
		yAxis: {
			label: buildAxisLabelSpec(options.yAxisLabel ?? 'Count', fontFamily),
			domain: options.axisDomains?.y
		},
		geometry: {
			type: 'histogram',
			bins: model.bins.map((bin) => ({
				binStart: bin.binStartMs,
				binEnd: bin.binEndMs,
				count: bin.count
			}))
		}
	});
}

export function attachFigureOverlays(
	spec: FigureRenderSpec,
	overlays?: FigureOverlaySpec
): FigureRenderSpec {
	return {
		...spec,
		overlays: cloneOverlays(overlays)
	};
}

export function renderFigureSpec(
	spec: FigureRenderSpec,
	backend: FigureRendererBackend
): RenderedFigureArtifact {
	return backend.render(spec);
}
