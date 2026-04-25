import type {
	ParsePupilCsvOptions,
	PupilParseDiagnostics,
	PupilParseMeta,
} from '@pupil/ingest/csv/types';
import type {
	PupilEvent,
	PupilMetricsResult,
	SegmentDefinition,
} from '@pupil/metrics/types';
import type { ComputePupilMetricsOptions } from '@pupil/metrics';

export interface PupilCsvPipelineOptions {
	parse?: ParsePupilCsvOptions;
	metrics?: ComputePupilMetricsOptions;
	events?: ReadonlyArray<PupilEvent>;
	segments?: ReadonlyArray<SegmentDefinition>;
}

export interface PupilCsvPipelineResult {
	parse: {
		meta: PupilParseMeta;
		diagnostics: PupilParseDiagnostics;
	};
	analysis: PupilMetricsResult;
}
