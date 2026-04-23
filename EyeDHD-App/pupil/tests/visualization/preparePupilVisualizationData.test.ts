import { describe, expect, it } from 'vitest';

import { preparePupilVisualizationData } from '@pupil/visualization/prep/preparePupilVisualizationData';
import type { PupilMetricsResult } from '@pupil/metrics/types';

function makeMetrics(): PupilMetricsResult {
	return {
		samples: [
			{ timeMs: 0, valueMm: 3.0 },
			{ timeMs: 100, valueMm: 3.1 },
			{ timeMs: 200, valueMm: 3.2 },
		],
		baseline: [
			{ timeMs: 0, baselineMm: 3.0, windowSize: 1 },
			{ timeMs: 100, baselineMm: 3.0, windowSize: 2 },
			{ timeMs: 200, baselineMm: 3.0, windowSize: 3 },
		],
		perFrame: [
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
		perFrameRows: [],
		perEventRows: [],
	};
}

describe('preparePupilVisualizationData', () => {
	it('builds the time-series model from samples', () => {
		const result = preparePupilVisualizationData({ metrics: makeMetrics() });
		expect(result.timeSeries.points).toEqual([
			{ timeMs: 0, valueMm: 3.0 },
			{ timeMs: 100, valueMm: 3.1 },
			{ timeMs: 200, valueMm: 3.2 },
		]);
	});

	it('drops non-finite percent changes from the normalized model', () => {
		const result = preparePupilVisualizationData({ metrics: makeMetrics() });
		expect(result.normalized.points.map((p) => p.timeMs)).toEqual([0, 100]);
	});

	it('passes through the event-locked grid and average points', () => {
		const result = preparePupilVisualizationData({ metrics: makeMetrics() });
		expect(result.eventLocked.gridStepMs).toBe(100);
		expect(result.eventLocked.preMs).toBe(100);
		expect(result.eventLocked.postMs).toBe(100);
		expect(result.eventLocked.points).toHaveLength(3);
		expect(result.eventLocked.points[1]).toEqual({
			timeRelMs: 0,
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
});
