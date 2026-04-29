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
	SegmentEpochVizModel,
} from '@pupil/visualization/prep/types';
import {
	relativeTimeAxisLabel,
	segmentRelativeTimeAxisLabel,
	timeAxisLabel,
} from '@pupil/visualization/prep/timeAxis';

/** Mean pupil diameter (mm) over time. */
export function buildPupilTimeSeriesSpec(
	model: PupilTimeSeriesModel,
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	const fontFamily = resolveFontFamily(options);
	const defaultXLabel = timeAxisLabel(model.unit);
	const toXY = (p: { t: number; valueMm: number }) => ({ x: p.t, y: p.valueMm });
	const isFinitePt = (p: { t: number; valueMm: number }) =>
		Number.isFinite(p.t) && Number.isFinite(p.valueMm);

	const series: LineSeriesSpec[] = [];
	if (model.leftPoints && model.rightPoints) {
		series.push(
			{ seriesId: 'pupil-left-diameter', points: model.leftPoints.filter(isFinitePt).map(toXY) },
			{ seriesId: 'pupil-right-diameter', points: model.rightPoints.filter(isFinitePt).map(toXY) }
		);
	}
	series.push({
		seriesId: 'pupil-mean-diameter',
		points: model.points.filter(isFinitePt).map(toXY),
	});

	const showLegend = !!(model.leftPoints && model.rightPoints);

	return buildBaseFigureSpec({
		figureId: options.figureId ?? 'pupil-timeseries-figure',
		kind: 'custom',
		options: {
			...options,
			legend:
				options.legend ??
				(showLegend ? { show: true, position: 'right' } : undefined),
		},
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
		geometry: { type: 'line', series },
	});
}

/** Per-frame % change relative to the rolling baseline. */
export function buildNormalizedPupilSpec(
	model: NormalizedPupilModel,
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	const fontFamily = resolveFontFamily(options);
	const defaultXLabel = timeAxisLabel(model.unit);
	const toXY = (p: { t: number; percentChange: number }) => ({
		x: p.t,
		y: p.percentChange,
	});
	const isFinitePt = (p: { t: number; percentChange: number }) =>
		Number.isFinite(p.t) && Number.isFinite(p.percentChange);

	const series: LineSeriesSpec[] = [];
	if (model.leftPoints && model.rightPoints) {
		series.push(
			{
				seriesId: 'pupil-left-percent-change',
				points: model.leftPoints.filter(isFinitePt).map(toXY),
			},
			{
				seriesId: 'pupil-right-percent-change',
				points: model.rightPoints.filter(isFinitePt).map(toXY),
			}
		);
	}
	series.push({
		seriesId: 'pupil-percent-change',
		points: model.points.filter(isFinitePt).map(toXY),
	});

	const showLegend = !!(model.leftPoints && model.rightPoints);

	return buildBaseFigureSpec({
		figureId: options.figureId ?? 'pupil-normalized-figure',
		kind: 'custom',
		options: {
			...options,
			legend:
				options.legend ??
				(showLegend ? { show: true, position: 'right' } : undefined),
		},
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
		geometry: { type: 'line', series },
	});
}

/**
 * Across-events grand mean ± SE on a common epoch grid. The mean is rendered
 * as a single line series with a translucent SE band attached; a vertical
 * reference at t = 0 is added as a segmentBoundary overlay.
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

	const bandPts = model.points.filter(
		(p) => Number.isFinite(p.meanPercent) && Number.isFinite(p.sePercent)
	);
	const upperPoints = bandPts.map((p) => ({ x: p.t, y: p.meanPercent + p.sePercent }));
	const lowerPoints = bandPts.map((p) => ({ x: p.t, y: p.meanPercent - p.sePercent }));

	const series: LineSeriesSpec[] = [
		{
			seriesId: 'pupil-erp-mean',
			points: meanPoints,
			band: bandPts.length > 0 ? { upperPoints, lowerPoints } : undefined,
		},
	];

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

/**
 * Per-segment epoch figure. One line of % change vs time across pre / during /
 * post, with two vertical reference lines: one at the segment start (t = 0)
 * and one at the segment end (t = segmentDurationScaled). Title defaults to
 * the segment label.
 */
export function buildSegmentEpochSpec(
	model: SegmentEpochVizModel,
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	const fontFamily = resolveFontFamily(options);
	const defaultXLabel = segmentRelativeTimeAxisLabel(model.unit);

	const points = model.points
		.filter((p) => Number.isFinite(p.percentChange))
		.map((p) => ({ x: p.t, y: p.percentChange }));

	const series: LineSeriesSpec[] = [
		{ seriesId: `pupil-segment-${model.segmentId}`, points },
	];

	const userOverlays = options.overlays ?? {};
	const startLine = { timeMs: 0, label: `${model.label} start` };
	const endLine = { timeMs: model.segmentDurationScaled, label: `${model.label} end` };
	const overlays = {
		markers: userOverlays.markers ? [...userOverlays.markers] : undefined,
		segmentBoundaries: [
			...(userOverlays.segmentBoundaries ?? []),
			startLine,
			endLine,
		],
	};

	return buildBaseFigureSpec({
		figureId: options.figureId ?? `pupil-segment-epoch-${model.segmentId}`,
		kind: 'custom',
		options: { ...options, overlays },
		defaultXAxisLabel: defaultXLabel,
		defaultYAxisLabel: '% Change from Baseline',
		title: buildTitleSpec(options.title ?? model.label, fontFamily),
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
