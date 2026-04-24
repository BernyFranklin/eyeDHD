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

	// Zero timeMs to the first parsed row so samples share a coordinate system
	// with caller-supplied events/segments (which are authored in recording-
	// relative ms). Raw captureTimeNs is preserved on the row for anyone who
	// needs absolute tracker time.
	const firstTimeMs = parsed.rows.length > 0 ? parsed.rows[0].timeMs : 0;
	const rows =
		firstTimeMs === 0
			? parsed.rows
			: parsed.rows.map((r) => ({ ...r, timeMs: r.timeMs - firstTimeMs }));

	const analysis = computePupilMetrics(
		{ rows, events: options.events ?? [] },
		options.metrics
	);

	return {
		parse: { meta: parsed.meta, diagnostics: parsed.diagnostics },
		analysis,
	};
}
