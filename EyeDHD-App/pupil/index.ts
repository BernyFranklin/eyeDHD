// Public schema + defaults
export type {
	EyeSelection,
	PupilSample,
	PupilAnalysisOptions,
} from './core/schema';
export { DEFAULT_PUPIL_OPTIONS } from './core/schema';

// Public ingest API
export type {
	RawPupilRow,
	ParsePupilCsvOptions,
	ParsePupilCsvResult,
	PupilParseDiagnostics,
	PupilParseMeta,
	PupilInvalidRowReason,
	PupilParseWarningCode,
	PupilParseErrorCode,
} from './ingest/csv/types';
export { parsePupilCsvSession } from './ingest/csv/parsePupilCsvSession';

// Public core / metrics API
export type {
	BaselineSample,
	BaselinePoint,
	RollingBaselineOptions,
} from './core/baseline';
export { computeRollingBaseline } from './core/baseline';

export type {
	PupilEvent,
	NormalizedPoint,
	EventEpoch,
	EventEpochPoint,
	EventLockedAveragePoint,
	EventLockedResult,
	PerFramePupilRow,
	PerEventPupilRow,
	PupilMetricsInput,
	PupilMetricsResult,
} from './metrics/types';
export {
	computePupilMetrics,
	computePercentChange,
	computeEventLocked,
	type ComputePupilMetricsOptions,
} from './metrics';

// Pipeline
export type { PupilCsvPipelineOptions, PupilCsvPipelineResult } from './pipeline/types';
export { runPupilCsvPipeline } from './pipeline/runPupilCsvPipeline';

// Visualization (data prep + figure spec builders)
export type {
	PupilTimeSeriesModel,
	NormalizedPupilModel,
	EventLockedPupilModel,
	PupilOverlaysModel,
	PupilVisualizationModels,
	SegmentDefinition,
	PreparePupilVisualizationDataInput,
} from './visualization/prep';
export { preparePupilVisualizationData } from './visualization/prep';
export {
	buildPupilTimeSeriesSpec,
	buildNormalizedPupilSpec,
	buildEventLockedPupilSpec,
} from './visualization/specs';
