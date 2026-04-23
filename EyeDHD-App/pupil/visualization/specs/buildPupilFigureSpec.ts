import type {
	BuildFigureRenderSpecOptions,
	FigureRenderSpec,
	LineSeriesSpec,
} from '@viz/render';
import {
	buildAxisLabelSpec,
	buildBaseFigureSpec,
	buildTitleSpec,
	resolveFontFamily,
} from '@viz/render';

import type {
	EventLockedPupilModel,
	NormalizedPupilModel,
	PupilTimeSeriesModel,
} from '@pupil/visualization/prep/types';
import {
	relativeTimeAxisLabel,
	timeAxisLabel,
} from '@pupil/visualization/prep/timeAxis';

/** Mean pupil diameter (mm) over time. */
export function buildPupilTimeSeriesSpec(
	model: PupilTimeSeriesModel,
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	const fontFamily = resolveFontFamily(options);
	const defaultXLabel = timeAxisLabel(model.unit);
	return buildBaseFigureSpec({
		figureId: options.figureId ?? 'pupil-timeseries-figure',
		kind: 'custom',
		options,
		defaultXAxisLabel: defaultXLabel,
		defaultYAxisLabel: 'Pupil Diameter (mm)',
		title: buildTitleSpec(options.title, fontFamily),
		xAxis: {
			label: buildAxisLabelSpec(options.xAxisLabel ?? defaultXLabel, fontFamily),
			scaleType: 'linear',
			domain: options.axisDomains?.x,
		},
		yAxis: {
			label: buildAxisLabelSpec(options.yAxisLabel ?? 'Pupil Diameter (mm)', fontFamily),
			scaleType: 'linear',
			domain: options.axisDomains?.y,
		},
		geometry: {
			type: 'line',
			series: [
				{
					seriesId: 'pupil-mean-diameter',
					points: model.points.map((p) => ({ x: p.t, y: p.valueMm })),
				},
			],
		},
	});
}

/** Per-frame % change relative to the rolling baseline. */
export function buildNormalizedPupilSpec(
	model: NormalizedPupilModel,
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	const fontFamily = resolveFontFamily(options);
	const defaultXLabel = timeAxisLabel(model.unit);
	return buildBaseFigureSpec({
		figureId: options.figureId ?? 'pupil-normalized-figure',
		kind: 'custom',
		options,
		defaultXAxisLabel: defaultXLabel,
		defaultYAxisLabel: '% Change from Baseline',
		title: buildTitleSpec(options.title, fontFamily),
		xAxis: {
			label: buildAxisLabelSpec(options.xAxisLabel ?? defaultXLabel, fontFamily),
			scaleType: 'linear',
			domain: options.axisDomains?.x,
		},
		yAxis: {
			label: buildAxisLabelSpec(
				options.yAxisLabel ?? '% Change from Baseline',
				fontFamily
			),
			scaleType: 'linear',
			domain: options.axisDomains?.y,
		},
		geometry: {
			type: 'line',
			series: [
				{
					seriesId: 'pupil-percent-change',
					points: model.points.map((p) => ({ x: p.t, y: p.percentChange })),
				},
			],
		},
	});
}

/**
 * Across-events grand mean ± SE on a common epoch grid.
 *
 * Renders three lines (mean, mean+SE, mean−SE) plus a vertical reference at
 * t = 0 added as a segmentBoundary overlay. Skipping a true filled SE band
 * for now — would require a new `FigureGeometrySpec` variant in `@viz/render`.
 */
export function buildEventLockedPupilSpec(
	model: EventLockedPupilModel,
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	const fontFamily = resolveFontFamily(options);
	const defaultXLabel = relativeTimeAxisLabel(model.unit);

	const meanPoints = model.points
		.filter((p) => Number.isFinite(p.meanPercent))
		.map((p) => ({ x: p.t, y: p.meanPercent }));

	const upperPoints = model.points
		.filter((p) => Number.isFinite(p.meanPercent) && Number.isFinite(p.sePercent))
		.map((p) => ({ x: p.t, y: p.meanPercent + p.sePercent }));

	const lowerPoints = model.points
		.filter((p) => Number.isFinite(p.meanPercent) && Number.isFinite(p.sePercent))
		.map((p) => ({ x: p.t, y: p.meanPercent - p.sePercent }));

	const series: LineSeriesSpec[] = [
		{ seriesId: 'pupil-erp-mean', points: meanPoints },
	];
	if (upperPoints.length > 0) {
		series.push({ seriesId: 'pupil-erp-upper-se', points: upperPoints });
		series.push({ seriesId: 'pupil-erp-lower-se', points: lowerPoints });
	}

	const userOverlays = options.overlays ?? {};
	const eventLine = { timeMs: 0, label: 'event' };
	const overlays = {
		markers: userOverlays.markers ? [...userOverlays.markers] : undefined,
		segmentBoundaries: [
			...(userOverlays.segmentBoundaries ?? []),
			eventLine,
		],
	};

	return buildBaseFigureSpec({
		figureId: options.figureId ?? 'pupil-event-locked-figure',
		kind: 'custom',
		options: { ...options, overlays },
		defaultXAxisLabel: defaultXLabel,
		defaultYAxisLabel: '% Change from Baseline',
		title: buildTitleSpec(options.title, fontFamily),
		xAxis: {
			label: buildAxisLabelSpec(options.xAxisLabel ?? defaultXLabel, fontFamily),
			scaleType: 'linear',
			domain: options.axisDomains?.x,
		},
		yAxis: {
			label: buildAxisLabelSpec(
				options.yAxisLabel ?? '% Change from Baseline',
				fontFamily
			),
			scaleType: 'linear',
			domain: options.axisDomains?.y,
		},
		geometry: {
			type: 'line',
			series,
		},
	});
}
