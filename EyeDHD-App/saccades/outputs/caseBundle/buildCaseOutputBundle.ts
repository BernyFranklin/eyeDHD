import type {
    BuildCaseOutputBundleOptions,
    CaseInfo,
    CaseOutputBundle,
    CaseOutputBundleInput,
    CaseOutputFileDescriptor,
} from './types';

// TO-DO: Specify types and remove 'any' types.
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

    const tables= {
        perSaccadeRows: input.analysis.perSaccade ?? [],
        sessionSummaryRows: 
            input.analysis.sessionSummary
            ? [input.analysis.sessionSummary]
            : [],
        segmentSummaryRows: input.analysis.segmentSummaries ?? [],
        isiHistogramRows,
        markerRows: input.visualization.markers ?? [],
    };

    const visuals = {
        scatterModel: input.visualization.scatter,
        rateSeriesModel: input.visualization.rateSeries,
        isiHistogramModel: input.visualization.isiHistogram,
        overlaysModel: {
            markers: input.visualization.markers,
        },
    };

    const files: CaseOutputFileDescriptor<any>[] = [
        {
            key: 'caseInfo',
            relativePath: 'metadata/case-info.json',
            format: 'json',
            category: 'metadata',
            optional: false,
            content: caseInfo,
        },
        {
            key: 'runConfig',
            relativePath: 'metadata/run-config.json',
            format: 'json',
            category: 'metadata',
            optional: false,
            content: input.runConfig,
        },
    ];

    // Push analysis CSV descriptors
    files.push(
        {
            key: 'perSaccadeCsv',
            relativePath: 'analysis/per-saccade.csv',
            format: 'csv',
            category: 'analysis',
            optional: false,
            content: tables.perSaccadeRows
        },
        {
            key: 'sessionSummaryCsv',
            relativePath: 'analysis/session-summary.csv',
            format: 'csv',
            category: 'analysis',
            optional: false,
            content: tables.sessionSummaryRows,
        },
        {
            key: 'isiHistogramCsv',
            relativePath: 'analysis/isi-histogram.csv',
            format: 'csv',
            category: 'analysis',
            optional: false,
            content: tables.isiHistogramRows,
        },
    );
    
    // Push visual CSV descriptors
    files.push(
        {
            key: 'scatterModelCsv',
            relativePath: 'visuals/scatter-model.csv',
            format: 'csv',
            category: 'visuals',
            optional:false,
            content: visuals.scatterModel.points,
        },
        {
            key: 'rateSeriesModelCsv',
            relativePath: 'visuals/rate-series-model.csv',
            format: 'csv',
            category: 'visuals',
            optional:false,
            content: visuals.rateSeriesModel.points,
        },
        {
            key: 'isiHistogramModelCsv',
            relativePath: 'visuals/isi-histogram-model.csv',
            format: 'csv',
            category: 'visuals',
            optional:false,
            content: tables.isiHistogramRows,
        },
    )
    
    // Push PNG placeholder descriptors
    files.push(
        {
            key: 'scatterPng',
            relativePath: 'visuals/scatter.png',
            format: 'png',
            category: 'visuals',
            optional: false,
            content: null, // Placeholder for actual PNG content
        },
        {
            key: 'rateSeriesPng',
            relativePath: 'visuals/rate-series.png',
            format: 'png',
            category: 'visuals',
            optional: false,
            content: null, // Placeholder for actual PNG content
        },
        {
            key: 'isiHistogramPng',
            relativePath: 'visuals/isi-histogram.png',
            format: 'png',
            category: 'visuals',
            optional: false,
            content: null, // Placeholder for actual PNG content
        },
    );
    
    // Push marker CSV descriptors only if markers exist
    if (tables.markerRows.length > 0) {
        files.push(
            {
                key: 'markersCsv',
                relativePath: 'analysis/markers.csv',
                format: 'csv',
                category: 'analysis',
                optional: true,
                content: tables.markerRows,
            }
        );
        
        files.push(
            {
                key: 'overlaysModelCsv',
                relativePath: 'visuals/overlays-model.csv',
                format: 'csv',
                category: 'visuals',
                optional: true,
                content: visuals.overlaysModel.markers,
            },
            
        );
    }
    
    // Push segment summary CSV descriptor only if segment summaries exist
    if (tables.segmentSummaryRows.length >0 ) {
        files.push(
            {
                key: 'segmentSummaryCsv',
                relativePath: 'analysis/segment-summary.csv',
                format: 'csv',
                category: 'analysis',
                optional: true,
                content: tables.segmentSummaryRows,
            },
        );
    }
    return {
        caseInfo,
        runConfig: input.runConfig,
        tables,
        visuals,
        files,
    };
}