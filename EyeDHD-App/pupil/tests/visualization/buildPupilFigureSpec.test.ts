import { describe, expect, it } from 'vitest';

import {
	buildEventLockedPupilSpec,
	buildNormalizedPupilSpec,
	buildPupilTimeSeriesSpec,
	buildSegmentEpochSpec,
} from '@pupil/visualization/specs/buildPupilFigureSpec';
import type {
	EventLockedPupilModel,
	NormalizedPupilModel,
	PupilTimeSeriesModel,
	SegmentEpochVizModel,
} from '@pupil/visualization/prep/types';

function makeTimeSeries(): PupilTimeSeriesModel {
	return {
		unit: 'ms',
		points: [
			{ t: 0, valueMm: 3.0 },
			{ t: 100, valueMm: 3.4 },
			{ t: 200, valueMm: 3.1 },
		],
	};
}

function makeNormalized(): NormalizedPupilModel {
	return {
		unit: 'ms',
		points: [
			{ t: 0, percentChange: 0 },
			{ t: 100, percentChange: 13 },
			{ t: 200, percentChange: 3 },
		],
	};
}

function makeEventLocked(): EventLockedPupilModel {
	return {
		unit: 'ms',
		gridStepMs: 100,
		preMs: 100,
		postMs: 100,
		points: [
			{ t: -100, meanPercent: 0, sePercent: 0.5, n: 3 },
			{ t: 0, meanPercent: 5, sePercent: 1.0, n: 3 },
			{ t: 100, meanPercent: 4, sePercent: 0.7, n: 3 },
		],
	};
}

describe('buildPupilTimeSeriesSpec', () => {
	it('produces a line geometry from the model points with mm on the y-axis', () => {
		const spec = buildPupilTimeSeriesSpec(makeTimeSeries());
		expect(spec.kind).toBe('custom');
		expect(spec.geometry.type).toBe('line');
		if (spec.geometry.type !== 'line') throw new Error('unreachable');
		expect(spec.geometry.series).toHaveLength(1);
		expect(spec.geometry.series[0].points).toEqual([
			{ x: 0, y: 3.0 },
			{ x: 100, y: 3.4 },
			{ x: 200, y: 3.1 },
		]);
		expect(spec.yAxis.label.text).toBe('Pupil Diameter (mm)');
		expect(spec.xAxis.label.text).toBe('Time (ms)');
	});

	it('reflects the model time unit on the default x-axis label', () => {
		const minSpec = buildPupilTimeSeriesSpec({
			unit: 'min',
			points: [
				{ t: 0, valueMm: 3.0 },
				{ t: 20, valueMm: 3.2 },
			],
		});
		expect(minSpec.xAxis.label.text).toBe('Time (min)');

		const secSpec = buildPupilTimeSeriesSpec({
			unit: 's',
			points: [{ t: 0, valueMm: 3.0 }],
		});
		expect(secSpec.xAxis.label.text).toBe('Time (s)');
	});

	it('respects user-provided title, axis labels, and overlays', () => {
		const spec = buildPupilTimeSeriesSpec(makeTimeSeries(), {
			title: 'Trial 1',
			xAxisLabel: 'ms',
			yAxisLabel: 'mm',
			overlays: {
				segmentBoundaries: [{ timeMs: 100, label: 'cue' }],
			},
		});
		expect(spec.title?.text).toBe('Trial 1');
		expect(spec.xAxis.label.text).toBe('ms');
		expect(spec.yAxis.label.text).toBe('mm');
		expect(spec.overlays?.segmentBoundaries).toEqual([{ timeMs: 100, label: 'cue' }]);
	});

	it('emits left, right, and mean series when dual-eye points are provided', () => {
		const spec = buildPupilTimeSeriesSpec({
			unit: 'ms',
			points: [{ t: 0, valueMm: 3.5 }],
			leftPoints: [{ t: 0, valueMm: 3.0 }],
			rightPoints: [{ t: 0, valueMm: 4.0 }],
		});
		if (spec.geometry.type !== 'line') throw new Error('unreachable');
		expect(spec.geometry.series.map((s) => s.seriesId)).toEqual([
			'pupil-left-diameter',
			'pupil-right-diameter',
			'pupil-mean-diameter',
		]);
	});

	it('falls back to single mean series when only one per-eye side is present', () => {
		const spec = buildPupilTimeSeriesSpec({
			unit: 'ms',
			points: [{ t: 0, valueMm: 3.0 }],
			leftPoints: [{ t: 0, valueMm: 3.0 }],
		});
		if (spec.geometry.type !== 'line') throw new Error('unreachable');
		expect(spec.geometry.series).toHaveLength(1);
		expect(spec.geometry.series[0].seriesId).toBe('pupil-mean-diameter');
	});
});

describe('buildNormalizedPupilSpec', () => {
	it('produces a line geometry with percent change on the y-axis', () => {
		const spec = buildNormalizedPupilSpec(makeNormalized());
		expect(spec.geometry.type).toBe('line');
		if (spec.geometry.type !== 'line') throw new Error('unreachable');
		expect(spec.geometry.series[0].points).toEqual([
			{ x: 0, y: 0 },
			{ x: 100, y: 13 },
			{ x: 200, y: 3 },
		]);
		expect(spec.yAxis.label.text).toBe('% Change from Baseline');
	});

	it('reflects the model time unit on the default x-axis label', () => {
		const spec = buildNormalizedPupilSpec({
			unit: 'min',
			points: [{ t: 0, percentChange: 0 }],
		});
		expect(spec.xAxis.label.text).toBe('Time (min)');
	});

	it('emits left, right, and mean series when dual-eye points are provided', () => {
		const spec = buildNormalizedPupilSpec({
			unit: 'ms',
			points: [{ t: 0, percentChange: 0 }],
			leftPoints: [{ t: 0, percentChange: -1 }],
			rightPoints: [{ t: 0, percentChange: 1 }],
		});
		if (spec.geometry.type !== 'line') throw new Error('unreachable');
		expect(spec.geometry.series.map((s) => s.seriesId)).toEqual([
			'pupil-left-percent-change',
			'pupil-right-percent-change',
			'pupil-percent-change',
		]);
	});
});

describe('buildEventLockedPupilSpec', () => {
	it('emits a single mean series with an SE band attached when SE is finite', () => {
		const spec = buildEventLockedPupilSpec(makeEventLocked());
		expect(spec.geometry.type).toBe('line');
		if (spec.geometry.type !== 'line') throw new Error('unreachable');
		expect(spec.geometry.series).toHaveLength(1);

		const meanSeries = spec.geometry.series[0];
		expect(meanSeries.seriesId).toBe('pupil-erp-mean');
		expect(meanSeries.points).toEqual([
			{ x: -100, y: 0 },
			{ x: 0, y: 5 },
			{ x: 100, y: 4 },
		]);

		expect(meanSeries.band).toBeDefined();
		expect(meanSeries.band?.upperPoints.map((p) => p.y)).toEqual([0.5, 6.0, 4.7]);
		expect(meanSeries.band?.lowerPoints.map((p) => p.y)).toEqual([-0.5, 4.0, 3.3]);
	});

	it('omits the SE band when SE is non-finite (single-event case)', () => {
		const model: EventLockedPupilModel = {
			unit: 'ms',
			gridStepMs: 100,
			preMs: 100,
			postMs: 100,
			points: [
				{ t: -100, meanPercent: 0, sePercent: NaN, n: 1 },
				{ t: 0, meanPercent: 5, sePercent: NaN, n: 1 },
			],
		};
		const spec = buildEventLockedPupilSpec(model);
		if (spec.geometry.type !== 'line') throw new Error('unreachable');
		expect(spec.geometry.series).toHaveLength(1);
		expect(spec.geometry.series[0].band).toBeUndefined();
	});

	it('always adds a vertical reference at t=0 via the segmentBoundary overlay', () => {
		const spec = buildEventLockedPupilSpec(makeEventLocked());
		const boundaries = spec.overlays?.segmentBoundaries ?? [];
		expect(boundaries.some((b) => b.timeMs === 0 && b.label === 'event')).toBe(true);
	});

	it('preserves user-supplied overlay markers and segment boundaries', () => {
		const spec = buildEventLockedPupilSpec(makeEventLocked(), {
			overlays: {
				markers: [{ timeMs: 50, label: 'sub-event', kind: 'note' }],
				segmentBoundaries: [{ timeMs: -50, label: 'cue' }],
			},
		});
		expect(spec.overlays?.markers).toEqual([
			{ timeMs: 50, label: 'sub-event', kind: 'note' },
		]);
		const boundaries = spec.overlays?.segmentBoundaries ?? [];
		expect(boundaries).toContainEqual({ timeMs: -50, label: 'cue' });
		expect(boundaries).toContainEqual({ timeMs: 0, label: 'event' });
	});

	it('uses the relative-time unit variant on the default x-axis label', () => {
		const spec = buildEventLockedPupilSpec({
			...makeEventLocked(),
			unit: 's',
		});
		expect(spec.xAxis.label.text).toBe('Time relative to event (s)');
	});
});

describe('buildSegmentEpochSpec', () => {
	function makeEpoch(): SegmentEpochVizModel {
		return {
			unit: 'ms',
			segmentId: 'trial-1',
			label: 'Trial 1',
			startMs: 1_000,
			endMs: 1_300,
			segmentDurationScaled: 300,
			preScaled: 100,
			postScaled: 100,
			points: [
				{ t: -100, percentChange: 0 },
				{ t: 0, percentChange: 5 },
				{ t: 150, percentChange: NaN },
				{ t: 300, percentChange: 4 },
				{ t: 400, percentChange: 2 },
			],
		};
	}

	it('emits a single series of finite-only points', () => {
		const spec = buildSegmentEpochSpec(makeEpoch());
		if (spec.geometry.type !== 'line') throw new Error('unreachable');
		expect(spec.geometry.series).toHaveLength(1);
		expect(spec.geometry.series[0].points).toEqual([
			{ x: -100, y: 0 },
			{ x: 0, y: 5 },
			{ x: 300, y: 4 },
			{ x: 400, y: 2 },
		]);
	});

	it('defaults the title to the segment label', () => {
		const spec = buildSegmentEpochSpec(makeEpoch());
		expect(spec.title?.text).toBe('Trial 1');
	});

	it('lets caller override the title', () => {
		const spec = buildSegmentEpochSpec(makeEpoch(), { title: 'Custom' });
		expect(spec.title?.text).toBe('Custom');
	});

	it('adds two segment-boundary overlays: start at 0 and end at durationScaled', () => {
		const spec = buildSegmentEpochSpec(makeEpoch());
		const boundaries = spec.overlays?.segmentBoundaries ?? [];
		expect(boundaries).toContainEqual({ timeMs: 0, label: 'Trial 1 start' });
		expect(boundaries).toContainEqual({ timeMs: 300, label: 'Trial 1 end' });
	});

	it('reflects the model time unit on the default x-axis label', () => {
		const spec = buildSegmentEpochSpec({ ...makeEpoch(), unit: 's' });
		expect(spec.xAxis.label.text).toBe('Time relative to segment start (s)');
	});
});
