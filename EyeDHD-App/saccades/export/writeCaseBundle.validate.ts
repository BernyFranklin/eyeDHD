// saccades/export/writeCaseBundle.validate.ts
// Manual validation harness — run with: npx tsx saccades/export/writeCaseBundle.validate.ts
// Produces real Skia-rendered PNGs in Desktop/validation-case/figures/

import fs from 'node:fs';
import path from 'node:path';

import { writeCaseBundle } from './writeCaseBundle';
import {
	buildScatterFigureSpec,
	buildRateSeriesFigureSpec,
	buildIsiHistogramFigureSpec
} from '@saccades/visualization/render';
import { createSkiaCanvasPngBackend } from '@saccades/visualization/render/backends/png';

import type { CaseOutputBundle, CaseOutputFileDescriptor } from './types';

const rootDir = path.join(process.env.USERPROFILE ?? '', 'Desktop');
const caseFolderName = 'validation-case';

const scatterDescriptor: CaseOutputFileDescriptor<unknown> = {
	key: 'scatterPng',
	relativePath: 'figures/scatter.png',
	format: 'png',
	category: 'visuals',
	optional: false,
	content: buildScatterFigureSpec(
		{
			points: [
				{ timeMs: 50, amplitudeDeg: 1.2 },
				{ timeMs: 120, amplitudeDeg: 3.8 },
				{ timeMs: 200, amplitudeDeg: 2.1 },
				{ timeMs: 310, amplitudeDeg: 5.5 },
				{ timeMs: 450, amplitudeDeg: 4.0 },
				{ timeMs: 520, amplitudeDeg: 1.9 },
				{ timeMs: 680, amplitudeDeg: 6.2 },
				{ timeMs: 790, amplitudeDeg: 3.4 },
				{ timeMs: 900, amplitudeDeg: 2.7 },
				{ timeMs: 1050, amplitudeDeg: 4.8 }
			]
		},
		{
			title: 'Saccade Amplitude vs Time',
			dimensions: { widthPx: 1200, heightPx: 800, dpi: 300 }
		}
	)
};

const rateSeriesDescriptor: CaseOutputFileDescriptor<unknown> = {
	key: 'rateSeriesPng',
	relativePath: 'figures/rate-series.png',
	format: 'png',
	category: 'visuals',
	optional: false,
	content: buildRateSeriesFigureSpec(
		{
			points: [
				{ timeMs: 0, ratePerSec: 0.5 },
				{ timeMs: 200, ratePerSec: 1.2 },
				{ timeMs: 400, ratePerSec: 2.8 },
				{ timeMs: 600, ratePerSec: 2.1 },
				{ timeMs: 800, ratePerSec: 3.5 },
				{ timeMs: 1000, ratePerSec: 1.8 },
				{ timeMs: 1200, ratePerSec: 2.4 },
				{ timeMs: 1400, ratePerSec: 3.0 }
			]
		},
		{
			title: 'Saccade Rate Over Time',
			dimensions: { widthPx: 1200, heightPx: 800, dpi: 300 }
		}
	)
};

const histogramDescriptor: CaseOutputFileDescriptor<unknown> = {
	key: 'isiHistogramPng',
	relativePath: 'figures/isi-histogram.png',
	format: 'png',
	category: 'visuals',
	optional: false,
	content: buildIsiHistogramFigureSpec(
		{
			bins: [
				{ binStartMs: 0, binEndMs: 50, count: 3 },
				{ binStartMs: 50, binEndMs: 100, count: 8 },
				{ binStartMs: 100, binEndMs: 150, count: 15 },
				{ binStartMs: 150, binEndMs: 200, count: 12 },
				{ binStartMs: 200, binEndMs: 250, count: 7 },
				{ binStartMs: 250, binEndMs: 300, count: 4 },
				{ binStartMs: 300, binEndMs: 350, count: 2 },
				{ binStartMs: 350, binEndMs: 400, count: 1 }
			]
		},
		{
			title: 'Inter-Saccadic Interval Distribution',
			dimensions: { widthPx: 1200, heightPx: 800, dpi: 300 }
		}
	)
};

const bundle: CaseOutputBundle = {
	caseInfo: {
		participantId: 'P-VALIDATION',
		caseId: 'validation-case',
		generatedAtIso: new Date().toISOString()
	},
	runConfig: {},
	tables: {
		perSaccadeRows: [],
		sessionSummaryRows: [],
		segmentSummaryRows: [],
		markerRows: [],
		isiHistogramRows: []
	},
	visuals: {
		scatterModel: { points: [] },
		rateSeriesModel: { binWidthMs: 200, points: [] },
		isiHistogramModel: { binWidthMs: 50, binEdges: [], counts: [] },
		overlaysModel: { markers: [] }
	},
	files: [scatterDescriptor, rateSeriesDescriptor, histogramDescriptor]
};

const backend = createSkiaCanvasPngBackend();

const result = writeCaseBundle(bundle, {
	rootDir,
	caseFolderName,
	png: { backend, dpi: 300, background: 'white' }
});

console.log(`Output directory: ${result.outputDir}`);
console.log(`Artifacts written: ${result.artifacts.length}`);
for (const artifact of result.artifacts) {
	const size = fs.statSync(artifact.absolutePath).size;
	console.log(`  ${artifact.relativePath} — ${size} bytes`);
}
