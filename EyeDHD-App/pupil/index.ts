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
