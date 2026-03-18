import type {
    BuildCaseOutputBundleOptions,
    CaseInfo,
    CaseOutputBundle,
    CaseOutputBundleInput,
} from './types';

export function buildCaseOutputBundle(
    input: CaseOutputBundleInput,
    options?: BuildCaseOutputBundleOptions,
): CaseOutputBundle {
    const caseInfo: CaseInfo = {
        participantId: input.metadata.participantId,
        caseId: input.metadata.caseId ?? 'case-unknown',
        sessionLabel: input.metadata.sessionLabel,
        studyLabel: input.metadata.studyLabel,
        generatedAtIso: options?.generatedAtIso ?? new Date().toISOString(),
    };

    return {
        caseInfo,
        runConfig: input.runConfig,
        tables: {
            perSaccadeRows: input.analysis.perSaccade ?? [],
            sessionSummaryRows: [],
            segmentSummaryRows: [],
            isiHistogramRows: [],
            markerRows: [],
        },
        visuals: {
            scatterModel: { points: [] },
            rateSeriesModel: { binWidthMs: 0, points: [] },
            isiHistogramModel: { binWidthMs: 0, binEdges: [], counts: [] },
            overlaysModel: { markers: [] },
        },
        files: [],
    };
}