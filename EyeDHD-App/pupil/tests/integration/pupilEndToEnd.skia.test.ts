// pupil/tests/integration/pupilEndToEnd.skia.test.ts
// Integration test: parses a fixture CSV, runs the full pupil pipeline,
// builds the output bundle, and writes it to disk with the real Skia backend.
// Asserts that every advertised artifact lands on disk with non-empty bytes.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runPupilCsvPipeline } from '@pupil/pipeline/runPupilCsvPipeline';
import { preparePupilVisualizationData } from '@pupil/visualization/prep/preparePupilVisualizationData';
import { buildPupilOutputBundle } from '@pupil/outputs/buildPupilOutputBundle';
import type { PupilEvent } from '@pupil/metrics/types';
import { DEFAULT_PUPIL_OPTIONS } from '@pupil/core/schema';

import { writeBundle } from '@viz/export';
import { createSkiaCanvasPngBackend } from '@viz/render/backends/png';

// PNG magic bytes — every valid PNG starts with this 8-byte signature.
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const HEADER = [
	'CaptureTime',
	'LeftEyeStatus',
	'LeftPupilDiameterInMM',
	'RightEyeStatus',
	'RightPupilDiameterInMM',
].join(',');

function buildFixtureCsv(): string {
	// 200 samples at 50ms steps (10 seconds total). Tonic 3.0 mm baseline,
	// with a dilation peaking around 4.5mm centered on the marker at 5000ms.
	const lines: string[] = [];
	for (let i = 0; i < 200; i++) {
		const t = i * 50;
		const dilation = Math.exp(-Math.pow((t - 5000) / 800, 2)) * 1.5;
		const value = (3.0 + dilation).toFixed(3);
		lines.push(`${t * 1_000_000},VALID,${value},VALID,${value}`);
	}
	return [HEADER, ...lines].join('\n');
}

const SEGMENTS = [
	{ id: 'baseline', startMs: 0, endMs: 4000 },
	{ id: 'task', startMs: 4000, endMs: 8000 },
];

const EVENTS: PupilEvent[] = SEGMENTS.flatMap((seg) => [
	{ id: `${seg.id}:start`, timeMs: seg.startMs, kind: 'segment_start', label: `${seg.id} start` },
	{ id: `${seg.id}:end`, timeMs: seg.endMs, kind: 'segment_end', label: `${seg.id} end` },
]);

describe('Pupil end-to-end (Skia render)', () => {
	it('writes all advertised artifacts (base 9 + per-event figures) with non-empty payloads from a fixture CSV', () => {
		const csv = buildFixtureCsv();

		const pipelineResult = runPupilCsvPipeline(csv, {
			events: EVENTS,
			metrics: {
				baselineWindowMs: 3000,
				baselinePercentile: 0.1,
				epochPreMs: 500,
				epochPostMs: 1500,
				gridStepMs: 50,
			},
		});

		expect(pipelineResult.parse.meta.validRowCount).toBe(200);

		const visualization = preparePupilVisualizationData({
			metrics: pipelineResult.analysis,
			segments: SEGMENTS,
			events: EVENTS,
		});

		const bundle = buildPupilOutputBundle({
			caseInfo: {
				caseId: 'integration-case',
				generatedAtIso: '2026-04-23T00:00:00.000Z',
			},
			runConfig: {
				eye: DEFAULT_PUPIL_OPTIONS.eye,
				baselineWindowMs: 3000,
				baselinePercentile: 0.1,
				epochPreMs: 500,
				epochPostMs: 1500,
				gridStepMs: 50,
			},
			metrics: pipelineResult.analysis,
			visualization,
			specOptions: {
				timeSeries: { title: 'Pupil Diameter — integration-case' },
				normalized: { title: 'Pupil % Change — integration-case' },
				eventLocked: { title: 'Event-Locked Pupil — integration-case' },
			},
		});

		const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pupil-e2e-'));
		try {
			const result = writeBundle(bundle.files, {
				rootDir,
				png: {
					backend: createSkiaCanvasPngBackend(),
					dpi: 300,
					background: 'white',
				},
			});

			// Base 9 artifacts + one PNG and one CSV per event-locked epoch.
			const expectedCount = 9 + 2 * EVENTS.length;
			expect(result.artifacts).toHaveLength(expectedCount);

			const expectedFiles = [
				'metadata/pupil-run-config.json',
				'analysis/pupil-per-frame.csv',
				'analysis/pupil-per-event.csv',
				'visuals/pupil-timeseries-model.csv',
				'visuals/pupil-normalized-model.csv',
				'visuals/pupil-event-locked-model.csv',
				'visuals/pupil-timeseries.png',
				'visuals/pupil-normalized.png',
				'visuals/pupil-event-locked.png',
			];

			for (const rel of expectedFiles) {
				const full = path.join(rootDir, rel);
				expect(fs.existsSync(full), `missing: ${rel}`).toBe(true);
				expect(fs.statSync(full).size, `empty: ${rel}`).toBeGreaterThan(0);
			}

			// Per-event figures land under visuals/event-locked/ and all exist.
			const epochDir = path.join(rootDir, 'visuals/event-locked');
			expect(fs.existsSync(epochDir)).toBe(true);
			const epochFiles = fs.readdirSync(epochDir);
			expect(epochFiles.filter((f) => f.endsWith('.png'))).toHaveLength(EVENTS.length);
			expect(epochFiles.filter((f) => f.endsWith('.csv'))).toHaveLength(EVENTS.length);

			// Every PNG (base + per-event) starts with the 8-byte PNG signature.
			const allPngs = [
				...expectedFiles.filter((f) => f.endsWith('.png')),
				...epochFiles.filter((f) => f.endsWith('.png')).map((f) => `visuals/event-locked/${f}`),
			];
			for (const rel of allPngs) {
				const bytes = fs.readFileSync(path.join(rootDir, rel));
				expect(bytes.subarray(0, 8).equals(PNG_SIGNATURE), `bad PNG header: ${rel}`).toBe(true);
			}

			// Per-event CSV has one row per event (4 segments × 2 boundaries) plus header.
			const perEvent = fs.readFileSync(path.join(rootDir, 'analysis/pupil-per-event.csv'), 'utf8');
			expect(perEvent.split('\n')).toHaveLength(EVENTS.length + 1);

			// Run-config persists the eye selection.
			const runConfig = JSON.parse(
				fs.readFileSync(path.join(rootDir, 'metadata/pupil-run-config.json'), 'utf8')
			) as { runConfig: { eye: string }; caseInfo: { caseId: string } };
			expect(runConfig.caseInfo.caseId).toBe('integration-case');
			expect(runConfig.runConfig.eye).toBe('mean');
		} finally {
			fs.rmSync(rootDir, { recursive: true, force: true });
		}
	});
});
