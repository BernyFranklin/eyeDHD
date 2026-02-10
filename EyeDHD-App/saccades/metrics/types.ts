// Needed for Section A
export interface SaccadeMetricsInput {
    startTime: number;       // ms
    endTime: number;         // ms
    amplitudeDeg: number;    // Degrees
}

// Needed for Section A
export interface PerSaccadeDerived extends SaccadeMetricsInput {
    durationMs: number;
    durationSec: number;
    ratePerSec: number;    // Deg/sec (0 for non-positive durations)
}

// Needed for Section B
export type PlausibleRange = { min: number; max: number };

// Needed for Section A
export interface SaccadeMetricResult {
    perSaccade: PerSaccadeDerived[];
}