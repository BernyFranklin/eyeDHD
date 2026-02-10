import type { SaccadeMetricsInput, PerSaccadeDerived, SaccadeMetricResult } from "./types";

// Section A of metrics tests
export function computeSaccadeMetrics(input: SaccadeMetricsInput[]): SaccadeMetricResult {
    // Lock in A2
    const perSaccade: PerSaccadeDerived[] = input.map(saccade => {
        const durationMs = saccade.endTime - saccade.startTime;
        const durationSec = durationMs / 1000;
        // Lock in A3
        const ratePerSec = 
            Number.isFinite(durationSec) && durationSec > 0
                ? saccade.amplitudeDeg / durationSec
                : 0; // Handle non-positive durations gracefully

        // Return new object without mutating inputs
        return {
            ...saccade,
            durationMs,
            durationSec,
            ratePerSec
        };
    });

    return { perSaccade };
}
    
