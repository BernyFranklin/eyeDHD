import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildPupilOutputBundle } from '@pupil/outputs/buildPupilOutputBundle';
import type { PupilOutputBundleInput } from '@pupil/outputs/types';
import type { PupilMetricsResult } from '@pupil/metrics/types';
import type { PupilVisualizationModels } from '@pupil/visualization/prep/types';

import { writeBundle } from '@viz/export';
import { createDeterministicPngBackend } from '@viz/render/backends/png';

function makeMetrics(): PupilMetricsResult {
	return {
		samples: [
			{ timeMs: 0, valueMm: 3.0 },
			{ timeMs: 100, valueMm: 3.4 },
		],
		baseline: [
			{ timeMs: 0, baselineMm: 3.0, windowSize: 1 },
			{ timeMs: 100, baselineMm: 3.0, windowSize: 2 },
		],
		perFrame: [
			{ timeMs: 0, valueMm: 3.0, baselineMm: 3.0, percentChange: 0 },
			{ timeMs: 100, valueMm: 3.4, baselineMm: 3.0, percentChange: 13.33 },
		],
		eventLocked: {
			gridStepMs: 100,
			preMs: 100,
			postMs: 100,
			epochs: [],
			average: [
				{ timeRelMs: -100, meanPercent: 0, sePercent: 0.5, n: 1 },
				{ timeRelMs: 0, meanPercent: 5, sePercent: 0.7, n: 1 },
				{ timeRelMs: 100, meanPercent: 3, sePercent: 0.6, n: 1 },
			],
		},
		perFrameRows: [
			{
				timeMs: 0,
				leftMm: 3.0,
				rightMm: 3.0,
				valueMm: 3.0,
				baselineMm: 3.0,
				percentChange: 0,
			},
			{
				timeMs: 100,
				leftMm: 3.4,
				rightMm: 3.4,
				valueMm: 3.4,
				baselineMm: 3.0,
				percentChange: 13.33,
			},
		],
		perEventRows: [
			{
				eventId: 'e1',
				kind: 'event',
				timeMs: 100,
				baselineMm: 3.0,
				peakPercent: 13.33,
				peakLatencyMs: 0,
				sampleCount: 3,
			},
		],
	};
}

function makeVisualization(): PupilVisualizationModels {
	return {
		timeSeries: {
			points: [
				{ timeMs: 0, valueMm: 3.0 },
				{ timeMs: 100, valueMm: 3.4 },
			],
		},
		normalized: {
			points: [
				{ timeMs: 0, percentChange: 0 },
				{ timeMs: 100, percentChange: 13.33 },
			],
		},
		eventLocked: {
			gridStepMs: 100,
			preMs: 100,
			postMs: 100,
			points: [
				{ timeRelMs: -100, meanPercent: 0, sePercent: 0.5, n: 1 },
				{ timeRelMs: 0, meanPercent: 5, sePercent: 0.7, n: 1 },
				{ timeRelMs: 100, meanPercent: 3, sePercent: 0.6, n: 1 },
			],
		},
		overlays: {
			markers: [],
			segmentBoundaries: [],
		},
	};
}

function makeInput(): PupilOutputBundleInput {
	return {
		caseInfo: {
			caseId: 'case-001',
			generatedAtIso: '2026-04-23T00:00:00.000Z',
		},
		runConfig: {
			eye: 'mean',
			baselineWindowMs: 15_000,
			baselinePercentile: 0.1,
			epochPreMs: 500,
			epochPostMs: 3_000,
			gridStepMs: 5,
		},
		metrics: makeMetrics(),
		visualization: makeVisualization(),
	};
}

function descriptorByKey(bundle: ReturnType<typeof buildPupilOutputBundle>, key: string) {
	const desc = bundle.files.find((f) => f.key === key);
	if (!desc) throw new Error(`No descriptor with key "${key}"`);
	return desc;
}

describe('buildPupilOutputBundle', () => {
	it('emits the full set of file descriptors with the documented relative paths', () => {
		const bundle = buildPupilOutputBundle(makeInput());

		const expected = new Map<string, string>([
			['pupilRunConfig', 'metadata/pupil-run-config.json'],
			['pupilPerFrame', 'analysis/pupil-per-frame.csv'],
			['pupilPerEvent', 'analysis/pupil-per-event.csv'],
			['pupilTimeSeriesModel', 'visuals/pupil-timeseries-model.csv'],
			['pupilNormalizedModel', 'visuals/pupil-normalized-model.csv'],
			['pupilEventLockedModel', 'visuals/pupil-event-locked-model.csv'],
			['pupilTimeSeriesPng', 'visuals/pupil-timeseries.png'],
			['pupilNormalizedPng', 'visuals/pupil-normalized.png'],
			['pupilEventLockedPng', 'visuals/pupil-event-locked.png'],
		]);

		expect(bundle.files).toHaveLength(expected.size);
		for (const [key, expectedPath] of expected) {
			expect(descriptorByKey(bundle, key).relativePath).toBe(expectedPath);
		}
	});

	it('attaches a FigureRenderSpec as the content of every PNG descriptor', () => {
		const bundle = buildPupilOutputBundle(makeInput());
		for (const key of [
			'pupilTimeSeriesPng',
			'pupilNormalizedPng',
			'pupilEventLockedPng',
		]) {
			const desc = descriptorByKey(bundle, key);
			expect(desc.format).toBe('png');
			const spec = desc.content as { kind: string; geometry: { type: string } };
			expect(spec).toBeDefined();
			expect(spec.kind).toBe('custom');
			expect(spec.geometry.type).toBe('line');
		}
	});

	it('threads per-figure spec options (e.g. title) into the rendered specs', () => {
		const bundle = buildPupilOutputBundle({
			...makeInput(),
			specOptions: {
				timeSeries: { title: 'Pupil over time — case-001' },
				normalized: { title: 'Normalized pupil — case-001' },
				eventLocked: { title: 'Event-locked — case-001' },
			},
		});
		const tsTitle =
			(descriptorByKey(bundle, 'pupilTimeSeriesPng').content as { title?: { text: string } })
				.title?.text;
		expect(tsTitle).toBe('Pupil over time — case-001');
	});

	it('serializes per-frame rows to CSV with all expected columns when written via @viz/export', () => {
		const bundle = buildPupilOutputBundle(makeInput());
		const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pupil-bundle-'));
		try {
			const result = writeBundle(bundle.files, {
				rootDir,
				png: {
					backend: createDeterministicPngBackend(),
					dpi: 300,
					background: 'white',
				},
			});
			expect(result.artifacts).toHaveLength(bundle.files.length);

			const perFrameCsv = fs.readFileSync(
				path.join(rootDir, 'analysis/pupil-per-frame.csv'),
				'utf8'
			);
			const headerLine = perFrameCsv.split('\n')[0].split(',').sort();
			expect(headerLine).toEqual(
				['baselineMm', 'leftMm', 'percentChange', 'rightMm', 'timeMs', 'valueMm'].sort()
			);
			expect(perFrameCsv.split('\n')).toHaveLength(3); // header + 2 rows

			const runConfig = JSON.parse(
				fs.readFileSync(path.join(rootDir, 'metadata/pupil-run-config.json'), 'utf8')
			) as { runConfig: { eye: string }; caseInfo: { caseId: string } };
			expect(runConfig.runConfig.eye).toBe('mean');
			expect(runConfig.caseInfo.caseId).toBe('case-001');

			// PNGs land on disk too (deterministic backend produces a small payload).
			for (const png of [
				'visuals/pupil-timeseries.png',
				'visuals/pupil-normalized.png',
				'visuals/pupil-event-locked.png',
			]) {
				expect(fs.statSync(path.join(rootDir, png)).size).toBeGreaterThan(0);
			}
		} finally {
			fs.rmSync(rootDir, { recursive: true, force: true });
		}
	});

	it('produces empty (header-only or no-row) CSVs for the per-event table when no events were analyzed', () => {
		const noEventsInput: PupilOutputBundleInput = {
			...makeInput(),
			metrics: { ...makeMetrics(), perEventRows: [] },
		};
		const bundle = buildPupilOutputBundle(noEventsInput);
		const perEvent = descriptorByKey(bundle, 'pupilPerEvent');
		expect(perEvent.optional).toBe(true);
		expect(perEvent.content).toEqual([]);
	});
});
