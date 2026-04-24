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
	EventLockedEpochModel,
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
		geometry: { type: 'line', series },
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

/**
 * Single-event epoch figure. One line of this event's % change vs time, with
 * a t = 0 vertical reference. Title defaults to the event label.
 */
export function buildEventLockedEpochSpec(
	model: EventLockedEpochModel,
	options: BuildFigureRenderSpecOptions = {}
): FigureRenderSpec {
	const fontFamily = resolveFontFamily(options);
	const defaultXLabel = relativeTimeAxisLabel(model.unit);

	const points = model.points
		.filter((p) => Number.isFinite(p.percentChange))
		.map((p) => ({ x: p.t, y: p.percentChange }));

	const series: LineSeriesSpec[] = [
		{ seriesId: `pupil-epoch-${model.eventId}`, points },
	];

	const userOverlays = options.overlays ?? {};
	const eventLine = { timeMs: 0, label: model.label };
	const overlays = {
		markers: userOverlays.markers ? [...userOverlays.markers] : undefined,
		segmentBoundaries: [
			...(userOverlays.segmentBoundaries ?? []),
			eventLine,
		],
	};

	return buildBaseFigureSpec({
		figureId: options.figureId ?? `pupil-event-locked-epoch-${model.eventId}`,
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
