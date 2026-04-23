import { describe, expect, it } from 'vitest';

import {
	buildEventLockedPupilSpec,
	buildNormalizedPupilSpec,
	buildPupilTimeSeriesSpec,
} from '@pupil/visualization/specs/buildPupilFigureSpec';
import type {
	EventLockedPupilModel,
	NormalizedPupilModel,
	PupilTimeSeriesModel,
} from '@pupil/visualization/prep/types';

function makeTimeSeries(): PupilTimeSeriesModel {
	return {
		points: [
			{ timeMs: 0, valueMm: 3.0 },
			{ timeMs: 100, valueMm: 3.4 },
			{ timeMs: 200, valueMm: 3.1 },
		],
	};
}

function makeNormalized(): NormalizedPupilModel {
	return {
		points: [
			{ timeMs: 0, percentChange: 0 },
			{ timeMs: 100, percentChange: 13 },
			{ timeMs: 200, percentChange: 3 },
		],
	};
}

function makeEventLocked(): EventLockedPupilModel {
	return {
		gridStepMs: 100,
		preMs: 100,
		postMs: 100,
		points: [
			{ timeRelMs: -100, meanPercent: 0, sePercent: 0.5, n: 3 },
			{ timeRelMs: 0, meanPercent: 5, sePercent: 1.0, n: 3 },
			{ timeRelMs: 100, meanPercent: 4, sePercent: 0.7, n: 3 },
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
});

describe('buildEventLockedPupilSpec', () => {
	it('emits three series (mean, mean+SE, mean−SE) when SE is finite', () => {
		const spec = buildEventLockedPupilSpec(makeEventLocked());
		expect(spec.geometry.type).toBe('line');
		if (spec.geometry.type !== 'line') throw new Error('unreachable');
		expect(spec.geometry.series).toHaveLength(3);

		const meanPts = spec.geometry.series[0].points;
		expect(meanPts).toEqual([
			{ x: -100, y: 0 },
			{ x: 0, y: 5 },
			{ x: 100, y: 4 },
		]);

		const upperPts = spec.geometry.series[1].points;
		expect(upperPts.map((p) => p.y)).toEqual([0.5, 6.0, 4.7]);

		const lowerPts = spec.geometry.series[2].points;
		expect(lowerPts.map((p) => p.y)).toEqual([-0.5, 4.0, 3.3]);
	});

	it('omits SE bands when SE is non-finite (single-event case)', () => {
		const model: EventLockedPupilModel = {
			gridStepMs: 100,
			preMs: 100,
			postMs: 100,
			points: [
				{ timeRelMs: -100, meanPercent: 0, sePercent: NaN, n: 1 },
				{ timeRelMs: 0, meanPercent: 5, sePercent: NaN, n: 1 },
			],
		};
		const spec = buildEventLockedPupilSpec(model);
		if (spec.geometry.type !== 'line') throw new Error('unreachable');
		expect(spec.geometry.series).toHaveLength(1);
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
});
