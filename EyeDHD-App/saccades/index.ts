
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
    SaccadeMetricResult,
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