import type {
    ScatterPoint,
    VisualizationPrepInput,
    VisualizationPrepOptions,
    VisualizationPrepResult,
} from './types';

export function prepareVisualizationModels(
    input: VisualizationPrepInput,
    options: VisualizationPrepOptions = {}
): VisualizationPrepResult {
    // Generate scatter points from per-saccade input data
    const scatterPoints: ScatterPoint[] = (input.perSaccade ?? []).map((saccade) => ({
        timeMs: saccade.timeMs,
        amplitudeDeg: saccade.amplitudeDeg,
        ...(saccade.segmentId !== undefined ? { segmentId: saccade.segmentId } : {}),
        ...(saccade.sourceIndex !== undefined ? { sourceIndex: saccade.sourceIndex } : {}),
    }));
    // Return object has VisualizationPrepResult structure
    return {
        scatter: { points: scatterPoints, },
        rateSeries: {
            binWidthMs: options.rateBinWidthMs ?? 1000,
            points: [], // TODO: compute rate series points
        },
        isiHistogram: {
            binWidthMs: options.isiBinWidthMs ?? 25,
            binEdges: [], // TODO: compute ISI histogram bin edges
            counts: [],   // TODO: compute ISI histogram counts
        },
        markers: [], // TODO: process event and segment markers
    };
}

