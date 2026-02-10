import type { 
    SaccadeMetricsInput, 
    PerSaccadeDerived, 
    SaccadeMetricResult,
    SaccadeMetricsOptions,
    FilterReason } from "./types";

// Needed for Section B
function inRange(value: number, min: number, max: number): boolean {
    return Number.isFinite(value) && value >= min && value <= max;
}

// Needed for Section A
export function computeSaccadeMetrics(
    input: SaccadeMetricsInput[],
    options: SaccadeMetricsOptions = {}
): SaccadeMetricResult {
    // Needed for Section B
    const bounds = options.plausibleBounds;
    // Needed for Section B
    const filtered = {
        totalFiltered: 0,
        byReason: {
            amplitude_out_of_bounds: 0,
            duration_out_of_bounds: 0
        } as Record<FilterReason, number>,
    };

    // Needed for Section B
    // Derive per-saccade fields WITHOUT mutating inputs
    const derived: PerSaccadeDerived[] = input.map(saccade => {
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
    // Needed for Section B
    // If no plausible bounds requested, keep all events
    if (!bounds) {
        return { perSaccade: derived, filtered };
    }

    const kept: PerSaccadeDerived[] = [];

    for (const s of derived) {
        const reasons: FilterReason[] = [];
        if (bounds.amplitudeDeg) {
            const { min, max } = bounds.amplitudeDeg;
            if (!inRange(s.amplitudeDeg, min, max)) {
                reasons.push("amplitude_out_of_bounds");
            }
        }

        if (bounds.durationMs) {
            const { min, max } = bounds.durationMs;
            if (!inRange(s.durationMs, min, max)) {
                reasons.push("duration_out_of_bounds");
            }
        }

        if (reasons.length === 0) {
            kept.push(s);
            continue;
        }

        filtered.totalFiltered += 1;
        for (const r of reasons) {
            filtered.byReason[r] += 1;
        }
    }

    return { perSaccade: kept, filtered };
}
    
