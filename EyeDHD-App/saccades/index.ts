import type { Vec3 } from "./velocities";
import type { SaccadeDetectionOptions } from "./schema";
import type { SaccadeMetricsOptions, SaccadeMetricsInput, SaccadeMetricsResult } from "./metrics";

import { detectSaccadesFromVectors } from "./detection";
import { computeSaccadeMetrics } from "./metrics";

// Public schema + defaults (events, options)
export type {
    SaccadeEvent,
    SaccadeEventExtended,
    SaccadeDetectionOptions,
} from "./schema";

export {
    DEFAULT_SAMPLING_RATE_HZ,
    DEFAULT_SACCADE_OPTIONS,
} from "./schema"

// Public velocities API (vector + velocity helpers)
export type { Vec3 } from "./velocities";
export {
    angularDisplacementDeg,
    angularVelocityDegPerSec,
    computeAngularVelocitiesDegPerSec,
} from "./velocities";

// Public detection API
export type {DetectSaccadeResult } from "./detection";
export { detectSaccadesFromVectors } from "./detection";

// Public metrics API
export { computeSaccadeMetrics } from "./metrics";
export type {
    SaccadeMetricsInput,
    PerSaccadeDerived,
    SaccadeMetricsResult,
    SaccadeMetricsOptions,

    PlausibleRange,
    PlausibleBounds,
    FilterReason,
    FilterTransparency,

    SegmentDefinition,
    SegmentSummary,
    UnassignedSummary,

    DistributionStats,
    SessionDistributions,
    SessionRateMetrics,

    IsiFilterReason,
    IsiFilterTransparency,
    IsiPlausibleBounds,
    IsiHistogramBinWidthMs,
    IsiHistogramBin,
    IsiHistogram,
    IsiSegmentSummary,
    IsiSegmentsMeta,

    PerSaccadeRow,
    XYPoint,

    SessionSummaryCsvRow,
    SegmentSummaryCsvRow,
} from "./metrics";

// Convenience wrapper for processing a full session of gaze data
export interface AnalyzeSaccadesResult {
    detection: ReturnType<typeof detectSaccadesFromVectors>;
    metrics: SaccadeMetricsResult;
}

// Runs full pipeline

export function analyzeSaccadesFromVectors(
    vectors: Vec3[],
    detectionOptions?: Partial<SaccadeDetectionOptions>,
    metricsOptions?: SaccadeMetricsOptions,
): AnalyzeSaccadesResult {
    const detection = detectSaccadesFromVectors(vectors, detectionOptions);

    // Convert detected saccades into metrics input (ms-based times)
    const metricsInput: SaccadeMetricsInput[] = detection.saccades.map(saccade => ({
        startTime: saccade.startTimeSec * 1000,
        endTime: saccade.endTimeSec * 1000,
        amplitudeDeg: saccade.amplitudeDeg,
    }));

    const metrics = computeSaccadeMetrics(metricsInput, metricsOptions);

    return { detection, metrics };
}
