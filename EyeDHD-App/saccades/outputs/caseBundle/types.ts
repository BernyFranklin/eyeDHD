export interface PerSaccadeRow {
	timeMs: number;
	amplitudeDeg: number;
	durationMs: number;
}

export interface SessionSummaryRow {
	[key: string]: unknown;
}

export interface SegmentSummaryRow {
	segmentId: string;
	saccadeCount: number;
	ratePerSec: number;
}

export interface MarkerRow {
	timeMs: number;
	label: string;
	kind: string;
}

export interface ScatterPoint {
	timeMs: number;
	amplitudeDeg: number;
}

export interface RateSeriesPoint {
	timeMs: number;
	ratePerSec: number;
}

export interface IsiHistogramRow {
	binStartMs: number;
	binEndMs: number;
	count: number;
}

export interface IsiHistogramModel {
	binWidthMs: number;
	binEdges: number[];
	counts: number[];
}

export interface AnimationFrameRow {
	timeMs: number;
	x: number;
	y: number;
	[key: string]: unknown;
}
// -------------------------------------------------
export interface CaseMetadataInput {
	participantId?: string;
	caseId?: string;
	sessionLabel?: string;
	studyLabel?: string;
	sourceFileName?: string;
}

export interface CaseRunConfigInput {
	detection?: Record<string, unknown>;
	metrics?: Record<string, unknown>;
	visualization?: Record<string, unknown>;
}

export interface CaseOutputBundleInput {
	metadata: CaseMetadataInput;
	runConfig: CaseRunConfigInput;

	analysis: {
		perSaccade?: PerSaccadeRow[];
		sessionSummary?: SessionSummaryRow;
		segmentSummaries?: SegmentSummaryRow[];
		isiValuesMs?: number[];
		diagnostics?: Record<string, unknown>;
	};

	visualization: {
		scatter: { points: ScatterPoint[] };
		rateSeries: { binWidthMs: number; points: RateSeriesPoint[] };
		isiHistogram: IsiHistogramModel;
		markers: MarkerRow[];
	};

	animation?: {
		frames?: AnimationFrameRow[];
	};
}

export interface CaseInfo {
	participantId?: string;
	caseId: string;
	sessionLabel?: string;
	studyLabel?: string;
	generatedAtIso: string;
}

export interface CaseOutputTables {
	perSaccadeRows: PerSaccadeRow[];
	sessionSummaryRows: SessionSummaryRow[];
	segmentSummaryRows: SegmentSummaryRow[];
	isiHistogramRows: IsiHistogramRow[];
	markerRows: MarkerRow[];
}

export interface CaseOutputVisualModels {
	scatterModel: { points: ScatterPoint[] };
	rateSeriesModel: {
		binWidthMs: number;
		points: RateSeriesPoint[];
	};
	isiHistogramModel: IsiHistogramModel;
	overlaysModel: {
		markers: MarkerRow[];
	};
}

export interface CaseOutputFileDescriptor<T> {
	key: string;
	relativePath: string;
	format: 'csv' | 'json' | 'png';
	category: 'metadata' | 'cleaned' | 'analysis' | 'visuals' | 'animation';
	optional: boolean;
	content: T;
}

export interface CaseOutputBundle {
	caseInfo: CaseInfo;
	runConfig: CaseRunConfigInput;

	tables: CaseOutputTables;
	visuals: CaseOutputVisualModels;
	animation?: {
		frames: AnimationFrameRow[];
	};

	files: CaseOutputFileDescriptor<unknown>[];
}

export interface BuildCaseOutputBundleOptions {
	generatedAtIso?: string;
}
