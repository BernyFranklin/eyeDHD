import type { 
    SaccadeMetricsInput, 
    PerSaccadeDerived, 
    SaccadeMetricResult,
    SaccadeMetricsOptions,
    FilterReason 
} from "./types";

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
    const kept: PerSaccadeDerived[] = [];

    if (!bounds) {
        kept.push(...derived);
    }
    else {
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
    }

    // Needed for Section C: compute session duration from kept saccades only
    let sessionDurationMs = 0;

    if (kept.length > 0) {
        let minStart = kept[0].startTime;
        let maxEnd = kept[0].endTime;

        for (const s of kept) {
            if (s.startTime < minStart) minStart = s.startTime;
            if (s.endTime > maxEnd) maxEnd = s.endTime;
        }
        // Clamp to 0 for safety
        sessionDurationMs = Math.max(0, maxEnd - minStart);
    }

    // Needed for Section C: compute durationSec + ratePerSec
    const sessionDurationSec = sessionDurationMs / 1000;
    const sessionRatePerSec = 
        Number.isFinite(sessionDurationSec) && sessionDurationSec > 0
            ? kept.length / sessionDurationSec
            : 0;
    // Needed for Section C: build session object
    const session: SaccadeMetricResult["session"] = {
        durationMs: sessionDurationMs,
        durationSec: sessionDurationSec,
        ratePerSec: sessionRatePerSec,

        ...(options.includeRatePerMin
            ? { ratePerMin: sessionRatePerSec * 60 }
            : {}),
    };

    return { perSaccade: kept, filtered, session };
}
    
