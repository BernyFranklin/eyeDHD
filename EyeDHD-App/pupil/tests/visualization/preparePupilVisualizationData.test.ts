import { describe, expect, it } from 'vitest';

import { preparePupilVisualizationData } from '@pupil/visualization/prep/preparePupilVisualizationData';
import type { PupilMetricsResult } from '@pupil/metrics/types';

function makeMetrics(overrides?: {
	samples?: PupilMetricsResult['samples'];
	perFrame?: PupilMetricsResult['perFrame'];
}): PupilMetricsResult {
	return {
		samples: overrides?.samples ?? [
			{ timeMs: 0, valueMm: 3.0 },
			{ timeMs: 100, valueMm: 3.1 },
			{ timeMs: 200, valueMm: 3.2 },
		],
		baseline: [
			{ timeMs: 0, baselineMm: 3.0, windowSize: 1 },
			{ timeMs: 100, baselineMm: 3.0, windowSize: 2 },
			{ timeMs: 200, baselineMm: 3.0, windowSize: 3 },
		],
		perFrame: overrides?.perFrame ?? [
			{ timeMs: 0, valueMm: 3.0, baselineMm: 3.0, percentChange: 0 },
			{ timeMs: 100, valueMm: 3.1, baselineMm: 3.0, percentChange: 3.33 },
			{ timeMs: 200, valueMm: 3.2, baselineMm: NaN, percentChange: NaN },
		],
		eventLocked: {
			gridStepMs: 100,
			preMs: 100,
			postMs: 100,
			epochs: [],
			average: [
				{ timeRelMs: -100, meanPercent: 0, sePercent: 0.5, n: 2 },
				{ timeRelMs: 0, meanPercent: 5, sePercent: 1.0, n: 2 },
				{ timeRelMs: 100, meanPercent: 3, sePercent: 0.7, n: 2 },
			],
		},
		segmentEpochs: { gridStepMs: 100, preMs: 100, postMs: 100, epochs: [] },
		perFrameRows: [],
		perEventRows: [],
	};
}

describe('preparePupilVisualizationData', () => {
	it('builds the time-series model from samples with the ms unit for short recordings', () => {
		const result = preparePupilVisualizationData({ metrics: makeMetrics() });
		expect(result.timeSeries.unit).toBe('ms');
		expect(result.timeSeries.points).toEqual([
			{ t: 0, valueMm: 3.0 },
			{ t: 100, valueMm: 3.1 },
			{ t: 200, valueMm: 3.2 },
		]);
	});

	it('zeros the axis to recording start and picks minutes for 20-minute recordings', () => {
		const T0 = 1_000_000_000_000; // epoch-style absolute timeMs
		const DURATION_MS = 20 * 60_000;
		const samples = [
			{ timeMs: T0, valueMm: 3.0 },
			{ timeMs: T0 + DURATION_MS / 2, valueMm: 3.1 },
			{ timeMs: T0 + DURATION_MS, valueMm: 3.2 },
		];
		const perFrame = samples.map((s) => ({
			timeMs: s.timeMs,
			valueMm: s.valueMm,
			baselineMm: 3.0,
			percentChange: ((s.valueMm - 3.0) / 3.0) * 100,
		}));
		const result = preparePupilVisualizationData({
			metrics: makeMetrics({ samples, perFrame }),
		});
		expect(result.timeAxis).toEqual({
			unit: 'min',
			t0Ms: T0,
			durationMs: DURATION_MS,
		});
		expect(result.timeSeries.unit).toBe('min');
		expect(result.timeSeries.points[0].t).toBe(0);
		expect(result.timeSeries.points[2].t).toBe(20);
	});

	it('picks seconds for sub-2-minute recordings', () => {
		const samples = [
			{ timeMs: 1000, valueMm: 3.0 },
			{ timeMs: 31_000, valueMm: 3.1 },
			{ timeMs: 61_000, valueMm: 3.2 },
		];
		const perFrame = samples.map((s) => ({
			timeMs: s.timeMs,
			valueMm: s.valueMm,
			baselineMm: 3.0,
			percentChange: 0,
		}));
		const result = preparePupilVisualizationData({
			metrics: makeMetrics({ samples, perFrame }),
		});
		expect(result.timeSeries.unit).toBe('s');
		expect(result.timeSeries.points.map((p) => p.t)).toEqual([0, 30, 60]);
	});

	it('drops non-finite percent changes from the normalized model', () => {
		const result = preparePupilVisualizationData({ metrics: makeMetrics() });
		expect(result.normalized.points.map((p) => p.t)).toEqual([0, 100]);
	});

	it('passes through the event-locked grid and average points', () => {
		const result = preparePupilVisualizationData({ metrics: makeMetrics() });
		expect(result.eventLocked.unit).toBe('ms');
		expect(result.eventLocked.gridStepMs).toBe(100);
		expect(result.eventLocked.preMs).toBe(100);
		expect(result.eventLocked.postMs).toBe(100);
		expect(result.eventLocked.points).toHaveLength(3);
		expect(result.eventLocked.points[1]).toEqual({
			t: 0,
			meanPercent: 5,
			sePercent: 1.0,
			n: 2,
		});
	});

	it('emits marker overlays from events with sensible label/kind fallbacks', () => {
		const result = preparePupilVisualizationData({
			metrics: makeMetrics(),
			events: [
				{ id: 'e1', timeMs: 50, kind: 'distractor', label: 'Distractor onset' },
				{ id: 'e2', timeMs: 150 },
			],
		});
		expect(result.overlays.markers).toEqual([
			{ timeMs: 50, label: 'Distractor onset', kind: 'distractor' },
			{ timeMs: 150, label: 'e2', kind: 'event' },
		]);
	});

	it('emits two segment-boundary overlays per segment (start + end)', () => {
		const result = preparePupilVisualizationData({
			metrics: makeMetrics(),
			segments: [
				{ id: 'baseline', startMs: 0, endMs: 100 },
				{ id: 'task', startMs: 100, endMs: 200 },
			],
		});
		expect(result.overlays.segmentBoundaries).toEqual([
			{ timeMs: 0, label: 'baseline start' },
			{ timeMs: 100, label: 'baseline end' },
			{ timeMs: 100, label: 'task start' },
			{ timeMs: 200, label: 'task end' },
		]);
	});

	it('returns empty overlay arrays when no segments or events are provided', () => {
		const result = preparePupilVisualizationData({ metrics: makeMetrics() });
		expect(result.overlays.markers).toEqual([]);
		expect(result.overlays.segmentBoundaries).toEqual([]);
	});

	it('builds one segment-epoch model per segment with scaled t and label fallback', () => {
		const base = makeMetrics();
		const metrics: PupilMetricsResult = {
			...base,
			segmentEpochs: {
				gridStepMs: 100,
				preMs: 100,
				postMs: 100,
				epochs: [
					{
						segmentId: 's1',
						label: 'Segment 1',
						startMs: 100,
						endMs: 300,
						durationMs: 200,
						points: [
							{ timeRelMs: -100, percentChange: 0 },
							{ timeRelMs: 0, percentChange: 5 },
							{ timeRelMs: 200, percentChange: 3 },
							{ timeRelMs: 300, percentChange: 2 },
						],
					},
					{
						segmentId: 's2',
						startMs: 500,
						endMs: 600,
						durationMs: 100,
						points: [{ timeRelMs: 0, percentChange: 4 }],
					},
				],
			},
		};
		const result = preparePupilVisualizationData({ metrics });
		expect(result.segmentEpochs).toHaveLength(2);
		expect(result.segmentEpochs[0]).toEqual({
			unit: 'ms',
			segmentId: 's1',
			label: 'Segment 1',
			startMs: 100,
			endMs: 300,
			segmentDurationScaled: 200,
			points: [
				{ t: -100, percentChange: 0 },
				{ t: 0, percentChange: 5 },
				{ t: 200, percentChange: 3 },
				{ t: 300, percentChange: 2 },
			],
		});
		// Falls back to segmentId when label is absent.
		expect(result.segmentEpochs[1].label).toBe('s2');
	});

	it('shares one time unit across all per-segment figures, sized for the longest span', () => {
		const base = makeMetrics();
		const metrics: PupilMetricsResult = {
			...base,
			segmentEpochs: {
				gridStepMs: 100,
				preMs: 1_000,
				postMs: 1_000,
				epochs: [
					// short: 2.2s span -> would pick 'ms' alone
					{
						segmentId: 's-short',
						startMs: 0,
						endMs: 200,
						durationMs: 200,
						points: [{ timeRelMs: 0, percentChange: 1 }],
					},
					// long: 22s span -> forces 's' for everyone
					{
						segmentId: 's-long',
						startMs: 1_000,
						endMs: 21_000,
						durationMs: 20_000,
						points: [{ timeRelMs: 0, percentChange: 1 }],
					},
				],
			},
		};
		const result = preparePupilVisualizationData({ metrics });
		expect(result.segmentEpochs.every((e) => e.unit === 's')).toBe(true);
		expect(result.segmentEpochs[1].segmentDurationScaled).toBe(20);
	});

	it('emits an empty segmentEpochs array when there are no segments', () => {
		const result = preparePupilVisualizationData({ metrics: makeMetrics() });
		expect(result.segmentEpochs).toEqual([]);
	});

	it('passes per-eye samples/perFrame through as scaled leftPoints/rightPoints when present', () => {
		const base = makeMetrics();
		const metrics: PupilMetricsResult = {
			...base,
			samplesLeft: [
				{ timeMs: 0, valueMm: 2.9 },
				{ timeMs: 100, valueMm: 3.0 },
			],
			samplesRight: [
				{ timeMs: 0, valueMm: 3.1 },
				{ timeMs: 100, valueMm: 3.2 },
			],
			perFrameLeft: [
				{ timeMs: 0, valueMm: 2.9, baselineMm: 2.9, percentChange: 0 },
				{ timeMs: 100, valueMm: 3.0, baselineMm: 2.9, percentChange: 3.45 },
			],
			perFrameRight: [
				{ timeMs: 0, valueMm: 3.1, baselineMm: 3.1, percentChange: 0 },
				{ timeMs: 100, valueMm: 3.2, baselineMm: 3.1, percentChange: 3.23 },
			],
		};
		const result = preparePupilVisualizationData({ metrics });
		expect(result.timeSeries.leftPoints).toEqual([
			{ t: 0, valueMm: 2.9 },
			{ t: 100, valueMm: 3.0 },
		]);
		expect(result.timeSeries.rightPoints).toEqual([
			{ t: 0, valueMm: 3.1 },
			{ t: 100, valueMm: 3.2 },
		]);
		expect(result.normalized.leftPoints?.map((p) => p.t)).toEqual([0, 100]);
		expect(result.normalized.rightPoints?.map((p) => p.t)).toEqual([0, 100]);
	});

	it('omits per-eye points when metrics did not provide them', () => {
		const result = preparePupilVisualizationData({ metrics: makeMetrics() });
		expect(result.timeSeries.leftPoints).toBeUndefined();
		expect(result.timeSeries.rightPoints).toBeUndefined();
		expect(result.normalized.leftPoints).toBeUndefined();
		expect(result.normalized.rightPoints).toBeUndefined();
	});
});
