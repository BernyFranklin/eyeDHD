// Interfaces for section A of metrics.test.ts
export interface SaccadeMetricsInput {
    startTime: number;       // ms
    endTime: number;         // ms
    amplitudeDeg: number;    // Degrees
}

export interface PerSaccadeDerived extends SaccadeMetricsInput {
    durationMs: number;
    durationSec: number;
    ratePerSec: number;    // Deg/sec (0 for non-positive durations)
}

export interface SaccadeMetricResult {
    perSaccade: PerSaccadeDerived[];
}