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
		segmentEpochs: { gridStepMs: 100, preMs: 100, postMs: 100, epochs: [] },
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
		timeAxis: { unit: 'ms', t0Ms: 0, durationMs: 100 },
		timeSeries: {
			unit: 'ms',
			points: [
				{ t: 0, valueMm: 3.0 },
				{ t: 100, valueMm: 3.4 },
			],
		},
		normalized: {
			unit: 'ms',
			points: [
				{ t: 0, percentChange: 0 },
				{ t: 100, percentChange: 13.33 },
			],
		},
		eventLocked: {
			unit: 'ms',
			gridStepMs: 100,
			preMs: 100,
			postMs: 100,
			points: [
				{ t: -100, meanPercent: 0, sePercent: 0.5, n: 1 },
				{ t: 0, meanPercent: 5, sePercent: 0.7, n: 1 },
				{ t: 100, meanPercent: 3, sePercent: 0.6, n: 1 },
			],
		},
		segmentEpochs: [],
		overlays: {
			markers: [],
			segmentBoundaries: [],
		},
	};
}

function makeEpochs(): PupilVisualizationModels['segmentEpochs'] {
	return [
		{
			unit: 'ms',
			segmentId: 'trial-1',
			label: 'Trial 1',
			startMs: 100,
			endMs: 200,
			segmentDurationScaled: 100,
			preScaled: 100,
			postScaled: 100,
			yDomain: [-2, 10],
			points: [
				{ t: -100, percentChange: 0 },
				{ t: 0, percentChange: 5 },
				{ t: 100, percentChange: 3 },
				{ t: 200, percentChange: 2 },
			],
		},
		{
			unit: 'ms',
			segmentId: 'trial-2',
			label: 'Trial 2',
			startMs: 500,
			endMs: 700,
			segmentDurationScaled: 200,
			preScaled: 100,
			postScaled: 100,
			yDomain: [-2, 10],
			points: [
				{ t: -100, percentChange: 0 },
				{ t: 0, percentChange: 8 },
				{ t: 200, percentChange: 4 },
				{ t: 300, percentChange: 1 },
			],
		},
	];
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
			segmentEpochPreMs: 5_000,
			segmentEpochPostMs: 5_000,
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
	it('emits the base 9 file descriptors with the documented relative paths when no epochs are present', () => {
		const bundle = buildPupilOutputBundle(makeInput());

		const expected = new Map<string, string>([
			['pupilRunConfig', 'metadata/pupil-run-config.json'],
			['pupilPerFrame', 'analysis/pupil-per-frame.csv'],
			['pupilPerEvent', 'analysis/pupil-per-event.csv'],
			['pupilTimeSeriesModel', 'visuals/data/pupil-timeseries-model.csv'],
			['pupilNormalizedModel', 'visuals/data/pupil-normalized-model.csv'],
			['pupilEventLockedModel', 'visuals/data/pupil-event-locked-model.csv'],
			['pupilTimeSeriesPng', 'visuals/images/pupil-timeseries.png'],
			['pupilNormalizedPng', 'visuals/images/pupil-normalized.png'],
			['pupilEventLockedPng', 'visuals/images/pupil-event-locked.png'],
		]);

		expect(bundle.files).toHaveLength(expected.size);
		for (const [key, expectedPath] of expected) {
			expect(descriptorByKey(bundle, key).relativePath).toBe(expectedPath);
		}
	});

	it('emits one PNG + one CSV per segment under visuals/segment-epoch/ with the grand-average PNG preserved', () => {
		const input = makeInput();
		input.visualization.segmentEpochs = makeEpochs();
		const bundle = buildPupilOutputBundle(input);

		const epochPaths = bundle.files
			.filter((f) => f.relativePath.startsWith('visuals/segment-epoch/'))
			.map((f) => f.relativePath)
			.sort();
		expect(epochPaths).toEqual([
			'visuals/segment-epoch/data/trial-1.csv',
			'visuals/segment-epoch/data/trial-2.csv',
			'visuals/segment-epoch/images/trial-1.png',
			'visuals/segment-epoch/images/trial-2.png',
		]);

		// No leftover per-event-locked directory artifacts.
		expect(
			bundle.files.some((f) => f.relativePath.startsWith('visuals/event-locked/'))
		).toBe(false);

		// Grand-average figure still present alongside per-segment figures.
		expect(descriptorByKey(bundle, 'pupilEventLockedPng').relativePath).toBe(
			'visuals/images/pupil-event-locked.png'
		);

		// Per-segment PNGs default their title to the segment label.
		const trial1Png = bundle.files.find(
			(f) => f.relativePath === 'visuals/segment-epoch/images/trial-1.png'
		);
		const spec = trial1Png!.content as { title?: { text: string } };
		expect(spec.title?.text).toBe('Trial 1');
	});

	it('slugifies segment ids and disambiguates duplicates by index', () => {
		const input = makeInput();
		input.visualization.segmentEpochs = [
			{ ...makeEpochs()[0], segmentId: 'Trial/1' },
			{ ...makeEpochs()[1], segmentId: 'Trial/1' },
		];
		const bundle = buildPupilOutputBundle(input);
		const paths = bundle.files
			.filter((f) => f.relativePath.startsWith('visuals/segment-epoch/') && f.format === 'png')
			.map((f) => f.relativePath);
		expect(paths).toEqual([
			'visuals/segment-epoch/images/trial-1.png',
			'visuals/segment-epoch/images/trial-1-2.png',
		]);
	});

	it('threads specOptions.segmentEpoch onto every per-segment PNG', () => {
		const input = makeInput();
		input.visualization.segmentEpochs = makeEpochs();
		const bundle = buildPupilOutputBundle({
			...input,
			specOptions: {
				segmentEpoch: { yAxisLabel: 'Δ% dilation' },
			},
		});
		const pngs = bundle.files.filter(
			(f) => f.relativePath.startsWith('visuals/segment-epoch/') && f.format === 'png'
		);
		expect(pngs).toHaveLength(2);
		for (const png of pngs) {
			const spec = png.content as { yAxis: { label: { text: string } } };
			expect(spec.yAxis.label.text).toBe('Δ% dilation');
		}
	});

	it('uses the case-wide yDomain and a [-preScaled, durationScaled + postScaled] xDomain on every per-segment PNG', () => {
		const input = makeInput();
		input.visualization.segmentEpochs = makeEpochs();
		const bundle = buildPupilOutputBundle(input);

		const trial1 = bundle.files.find(
			(f) => f.relativePath === 'visuals/segment-epoch/images/trial-1.png'
		);
		const trial2 = bundle.files.find(
			(f) => f.relativePath === 'visuals/segment-epoch/images/trial-2.png'
		);
		const spec1 = trial1!.content as {
			xAxis: { domain?: [number, number] };
			yAxis: { domain?: [number, number] };
		};
		const spec2 = trial2!.content as {
			xAxis: { domain?: [number, number] };
			yAxis: { domain?: [number, number] };
		};
		// xDomain spans from -preScaled to segmentDurationScaled + postScaled.
		expect(spec1.xAxis.domain).toEqual([-100, 200]);
		expect(spec2.xAxis.domain).toEqual([-100, 300]);
		// yDomain matches the shared case-wide domain on every per-segment PNG.
		expect(spec1.yAxis.domain).toEqual([-2, 10]);
		expect(spec2.yAxis.domain).toEqual([-2, 10]);
	});

	it('lets caller-supplied axisDomains in specOptions.segmentEpoch override the computed domains', () => {
		const input = makeInput();
		input.visualization.segmentEpochs = makeEpochs();
		const bundle = buildPupilOutputBundle({
			...input,
			specOptions: {
				segmentEpoch: {
					axisDomains: { x: [-50, 150], y: [-100, 100] },
				},
			},
		});
		const trial1 = bundle.files.find(
			(f) => f.relativePath === 'visuals/segment-epoch/images/trial-1.png'
		);
		const spec = trial1!.content as {
			xAxis: { domain?: [number, number] };
			yAxis: { domain?: [number, number] };
		};
		expect(spec.xAxis.domain).toEqual([-50, 150]);
		expect(spec.yAxis.domain).toEqual([-100, 100]);
	});

	it('renders two boundary overlays per segment (start at 0, end at durationScaled)', () => {
		const input = makeInput();
		input.visualization.segmentEpochs = makeEpochs();
		const bundle = buildPupilOutputBundle(input);
		const trial1 = bundle.files.find(
			(f) => f.relativePath === 'visuals/segment-epoch/images/trial-1.png'
		);
		const spec = trial1!.content as {
			overlays?: { segmentBoundaries?: Array<{ timeMs: number; label: string }> };
		};
		expect(spec.overlays?.segmentBoundaries).toEqual([
			{ timeMs: 0, label: 'Trial 1 start' },
			{ timeMs: 100, label: 'Trial 1 end' },
		]);
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
				'visuals/images/pupil-timeseries.png',
				'visuals/images/pupil-normalized.png',
				'visuals/images/pupil-event-locked.png',
			]) {
				expect(fs.statSync(path.join(rootDir, png)).size).toBeGreaterThan(0);
			}
		} finally {
			fs.rmSync(rootDir, { recursive: true, force: true });
		}
	});

	it('threads the model overlays (event markers, segment boundaries) onto the time-series and normalized PNGs', () => {
		const input = makeInput();
		const vis = input.visualization;
		vis.overlays.markers = [
			{ timeMs: 50, label: 'cue', kind: 'event' },
		];
		vis.overlays.segmentBoundaries = [
			{ timeMs: 0, label: 'baseline start' },
			{ timeMs: 100, label: 'baseline end' },
		];
		const bundle = buildPupilOutputBundle(input);

		for (const key of ['pupilTimeSeriesPng', 'pupilNormalizedPng']) {
			const spec = descriptorByKey(bundle, key).content as {
				overlays?: {
					markers?: Array<{ timeMs: number; label: string }>;
					segmentBoundaries?: Array<{ timeMs: number; label: string }>;
				};
			};
			expect(spec.overlays?.markers).toEqual([
				{ timeMs: 50, label: 'cue', kind: 'event' },
			]);
			expect(spec.overlays?.segmentBoundaries).toEqual([
				{ timeMs: 0, label: 'baseline start' },
				{ timeMs: 100, label: 'baseline end' },
			]);
		}
	});

	it('merges caller-supplied overlays with the model overlays (caller first)', () => {
		const input = makeInput();
		input.visualization.overlays.segmentBoundaries = [
			{ timeMs: 100, label: 'baseline end' },
		];
		const bundle = buildPupilOutputBundle({
			...input,
			specOptions: {
				timeSeries: {
					overlays: {
						segmentBoundaries: [{ timeMs: 50, label: 'caller cue' }],
					},
				},
			},
		});
		const spec = descriptorByKey(bundle, 'pupilTimeSeriesPng').content as {
			overlays?: { segmentBoundaries?: Array<{ timeMs: number; label: string }> };
		};
		expect(spec.overlays?.segmentBoundaries).toEqual([
			{ timeMs: 50, label: 'caller cue' },
			{ timeMs: 100, label: 'baseline end' },
		]);
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
