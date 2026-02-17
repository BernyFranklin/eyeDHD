export { computeSaccadeMetrics } from "./metrics";

// Re-export public types only
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
} from "./types";