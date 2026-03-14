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

    // Use provided bin widths or default values
    const binWidthMs = options.rateBinWidthMs ?? 1000;

    // Generate rate series points
    const rateSeriesPoints = (() => {
        // If no saccades, return empty array
        const saccades = input.perSaccade ?? [];  
        if (saccades.length === 0) return [];

        // Determine time range and bin edges
        const minTime = Math.min(...saccades.map(s => s.timeMs));
        const maxTime = Math.max(...saccades.map(s => s.timeMs));

        // Create bins based on the time range and bin width
        const startBin = Math.floor(minTime / binWidthMs);
        const endBin = Math.floor(maxTime / binWidthMs);

        // Initialize bins 
        const bins: Record<number, number> = {};

        // Fill bins with zero counts for the entire range
        for (let i = startBin; i <= endBin; i++) {
            bins[i] = 0;
        }
        
        // Count saccades in each bin
        for (const s of saccades) {
            const binIndex = Math.floor(s.timeMs / binWidthMs);
            bins[binIndex] = (bins[binIndex] ?? 0) + 1;
        }

        // Convert counts to rate per second
        const ratePerSecFactor = 1000 / binWidthMs;

        // Convert bins to rate series points
        return Object.keys(bins)
        .map(Number)
        .sort((a, b) => a - b)
        .map((binIndex) => {
            const count = bins[binIndex];
            const start = binIndex * binWidthMs;

            return {
                timeMs: start + binWidthMs / 2,
                count,
                ratePerSec: count * ratePerSecFactor,
            };
        });
    })();

    // Generate ISI Histogram data
    const isiBinWidthMs = options.isiBinWidthMs ?? 25;

    const isiHistogram = (() => {
        // If no ISI values, return empty histogram
        const isiValues = input.isiValuesMs ?? [];
        if (isiValues.length === 0) {
            return {
                binWidthMs: isiBinWidthMs,
                binEdges: [],
                counts: [],
            };
        }

        // Determine max ISI to set histogram range
        const maxIsi = Math.max(...isiValues);
        // Calculate number of bins needed to cover the range of ISI values
        const binCount = Math.floor(maxIsi / isiBinWidthMs) + 1;
        // Create bin edges based on the number of bins and bin width
        const binEdges = Array.from(
            { length: binCount + 1},
            (_, i) => i * isiBinWidthMs
        );
        // Initialize counts for each bin
        const counts = Array.from({ length: binCount }, () => 0);
        // Count ISI values in each bin
        for (const value of isiValues) {
            const binIndex = Math.floor(value / isiBinWidthMs);
            counts[binIndex] += 1;
        }
        // Return histogram data structure
        return {
            binWidthMs: isiBinWidthMs,
            binEdges,
            counts,
        };
    })();
    
    // Generate overlay
    const markers = (() => {
        if (!options.includeMarkers) return [];

        const eventMarkers = (input.markers ?? []).map((marker) => ({
            kind: 'event' as const,
            timeMs: marker.timeNs / 1_000_000,
            type: marker.type,
            ...(marker.label !== undefined ? { label: marker.label } : {}),
        }));
        return eventMarkers;
    })();
    // Return object as VisualizationPrepResult structure
    return {
        scatter: { points: scatterPoints, },
        rateSeries: {
            binWidthMs,
            points: rateSeriesPoints, 
        },
        isiHistogram,
        markers, 
    };
}

