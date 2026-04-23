import { describe, expect, it } from 'vitest';

import { runPupilCsvPipeline } from '@pupil/pipeline/runPupilCsvPipeline';

const HEADER = [
	'CaptureTime',
	'LeftEyeStatus',
	'LeftPupilDiameterInMM',
	'RightEyeStatus',
	'RightPupilDiameterInMM',
].join(',');

function buildCsv(samples: Array<{ timeMs: number; left: number; right: number }>): string {
	const lines = samples.map(
		(s) => `${s.timeMs * 1_000_000},VALID,${s.left},VALID,${s.right}`
	);
	return [HEADER, ...lines].join('\n');
}

describe('runPupilCsvPipeline', () => {
	it('parses CSV and produces baseline, perFrame, and event-locked outputs', () => {
		// 21 samples at 100ms steps (0..2000ms). Mostly tonic 3.0, with a small
		// dilation around the event.
		const samples = Array.from({ length: 21 }, (_, i) => {
			const t = i * 100;
			const value = t >= 800 && t <= 1200 ? 3.6 : 3.0;
			return { timeMs: t, left: value, right: value };
		});
		const csv = buildCsv(samples);

		const result = runPupilCsvPipeline(csv, {
			events: [{ id: 'event-1', timeMs: 1000, kind: 'event' }],
			metrics: {
				baselineWindowMs: 1500,
				baselinePercentile: 0.1,
				epochPreMs: 200,
				epochPostMs: 200,
				gridStepMs: 100,
			},
		});

		expect(result.parse.meta.validRowCount).toBe(21);
		expect(result.analysis.samples).toHaveLength(21);
		expect(result.analysis.baseline).toHaveLength(21);
		expect(result.analysis.perFrame).toHaveLength(21);

		// Adaptive baseline should track the tonic 3.0, not the dilation.
		const baselineNearEvent = result.analysis.baseline[10].baselineMm;
		expect(baselineNearEvent).toBeCloseTo(3.0, 1);

		// % change at the dilation peak should be positive.
		const perFrameAtPeak = result.analysis.perFrame[10];
		expect(perFrameAtPeak.percentChange).toBeGreaterThan(15);

		// Event-locked epoch should have one entry covering -200..+200 at 100ms step.
		expect(result.analysis.eventLocked.epochs).toHaveLength(1);
		expect(result.analysis.eventLocked.average.length).toBe(5);

		// PerEvent row records the peak.
		expect(result.analysis.perEventRows).toHaveLength(1);
		expect(result.analysis.perEventRows[0].peakPercent).toBeGreaterThan(15);
	});

	it('respects the eye selection option (left vs mean)', () => {
		const samples = Array.from({ length: 5 }, (_, i) => ({
			timeMs: i * 100,
			left: 3.0,
			right: 5.0,
		}));
		const csv = buildCsv(samples);

		const left = runPupilCsvPipeline(csv, {
			metrics: { eye: 'left', baselineWindowMs: 200, baselinePercentile: 0.5 },
		});
		const mean = runPupilCsvPipeline(csv, {
			metrics: { eye: 'mean', baselineWindowMs: 200, baselinePercentile: 0.5 },
		});

		expect(left.analysis.samples[0].valueMm).toBe(3.0);
		expect(mean.analysis.samples[0].valueMm).toBe(4.0);
	});

	it('handles a CSV with no events by producing empty event-locked output', () => {
		const csv = buildCsv([
			{ timeMs: 0, left: 3, right: 3 },
			{ timeMs: 100, left: 3, right: 3 },
		]);
		const result = runPupilCsvPipeline(csv);
		expect(result.analysis.eventLocked.epochs).toEqual([]);
		expect(result.analysis.perEventRows).toEqual([]);
		// Average is still a grid (just with n=0 everywhere).
		expect(
			result.analysis.eventLocked.average.every((p) => p.n === 0)
		).toBe(true);
	});

	it('drops rows where the chosen eye is invalid', () => {
		const csv = [
			HEADER,
			`0,VALID,3.0,VALID,3.0`,
			`100000000,INVALID,0,VALID,3.0`, // left invalid → dropped when eye:'left'
			`200000000,VALID,3.0,VALID,3.0`,
		].join('\n');

		const left = runPupilCsvPipeline(csv, { metrics: { eye: 'left' } });
		expect(left.analysis.samples).toHaveLength(2);
		expect(left.analysis.samples.map((s) => s.timeMs)).toEqual([0, 200]);
	});
});
