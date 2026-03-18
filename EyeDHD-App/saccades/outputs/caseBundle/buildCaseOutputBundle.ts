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

    const isiHistogramRows = input.visualization.isiHistogram.counts.map(
        (count, index) => ({
            binStartMs: input.visualization.isiHistogram.binEdges[index],
            binEndMs: input.visualization.isiHistogram.binEdges[index + 1],
            count,
        })
    );

    return {
        caseInfo,
        runConfig: input.runConfig,
        tables: {
            perSaccadeRows: input.analysis.perSaccade ?? [],
            sessionSummaryRows: 
                input.analysis.sessionSummary
                ? [input.analysis.sessionSummary]
                : [],
            segmentSummaryRows: input.analysis.segmentSummaries ?? [],
            isiHistogramRows,
            markerRows: [],
        },
        visuals: {
            scatterModel: input.visualization.scatter,
            rateSeriesModel: input.visualization.rateSeries,
            isiHistogramModel: { binWidthMs: 0, binEdges: [], counts: [] },
            overlaysModel: { markers: [] },
        },
        files: [],
    };
}