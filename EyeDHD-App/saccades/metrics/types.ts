// Needed for Section A
export interface SaccadeMetricsInput {
    startTime:    number;    // ms
    endTime:      number;    // ms
    amplitudeDeg: number;    // Degrees
}

// Needed for Section A
export interface PerSaccadeDerived extends SaccadeMetricsInput {
    durationMs:  number;
    durationSec: number;
    ratePerSec:  number;    // Deg/sec (0 for non-positive durations)
}

// Needed for Section B
export type PlausibleRange = { min: number; max: number };

// Needed for Section B
export interface PlausibleBounds {
    amplitudeDeg?: PlausibleRange;
    durationMs?:   PlausibleRange;
}

// Needed for Section B
export interface SaccadeMetricsOptions {
    plausibleBounds?: PlausibleBounds;
    // Needed for Section C, optional toggle
    includeRatePerMin?: boolean;
}

// Needed for Section B
export type FilterReason = "amplitude_out_of_bounds" | "duration_out_of_bounds";

// Needed for Section B
export interface FilterTransparency {
    totalFiltered: number;
    byReason: Record<FilterReason, number>;
}

// Needed for Section C: session metrics shape
export interface SessionRateMetrics {
    durationMs:  number;
    durationSec: number;
    ratePerSec:  number;
    ratePerMin?: number;
}

// Needed for Section A
export interface SaccadeMetricResult {
    perSaccade: PerSaccadeDerived[];
    // Needed for Section B
    filtered: FilterTransparency;
    // Needed for Section C
    session: SessionRateMetrics;
}