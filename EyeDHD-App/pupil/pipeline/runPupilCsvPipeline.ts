import { parsePupilCsvSession } from '@pupil/ingest/csv/parsePupilCsvSession';
import { computePupilMetrics } from '@pupil/metrics';

import type {
	PupilCsvPipelineOptions,
	PupilCsvPipelineResult,
} from './types';

export function runPupilCsvPipeline(
	csvText: string,
	options: PupilCsvPipelineOptions = {}
): PupilCsvPipelineResult {
	const parsed = parsePupilCsvSession(csvText, options.parse);

	const analysis = computePupilMetrics(
		{ rows: parsed.rows, events: options.events ?? [] },
		options.metrics
	);

	return {
		parse: { meta: parsed.meta, diagnostics: parsed.diagnostics },
		analysis,
	};
}
