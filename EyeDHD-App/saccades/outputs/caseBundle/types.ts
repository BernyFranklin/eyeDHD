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
        perSaccade?: any[];
        sessionSummary?: Record<string, unknown>;
        segmentSummaries?: any[];
        isiValuesMs?: number[];
        diagnostics?: Record<string, unknown>;
    };

    visualization: {
        scatter: { points: any[] };
        rateSeries: { binWidthMs: number; points: any[] };
        isiHistogram: { binWidthMs: number; binEdges: number[]; counts: number[] };
        markers: any[];
    };

    animation?: {
        frames?: any[];
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
    perSaccadeRows: any[];
    sessionSummaryRows: any[];
    segmentSummaryRows: any[];
    isiHistogramRows: any[];
    markerRows: any[];
}

export interface CaseOutputVisualModels {
    scatterModel: { points: any[] };
    rateSeriesModel: {
        binWidthMs: number;
        points: any[];
    };
    isiHistogramModel: {
        binWidthMs: number;
        binEdges: number[];
        counts: number[];
    };
    overlaysModel: {
        markers: any[];
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
    animation?: Record<string, unknown>;

    files: CaseOutputFileDescriptor<any>[];
}

export interface BuildCaseOutputBundleOptions {
    generatedAtIso?: string;
}