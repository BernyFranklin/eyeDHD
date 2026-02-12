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
    plausibleBounds?:        PlausibleBounds;
    // Needed for Section C, optional toggle
    includeRatePerMin?:      boolean;
    // Needed for Section D
    segments?:               SegmentDefinition[];
    // Needed for Section F
    isiPlausibleBounds?:     IsiPlausibleBounds;
    isiHistogramBinWidthMs?: IsiHistogramBinWidthMs;
    isiBySegment?:           boolean; 
}

// Needed for Section B
export type FilterReason = "amplitude_out_of_bounds" | "duration_out_of_bounds";

// Needed for Section B
export interface FilterTransparency {
    totalFiltered: number;
    byReason:      Record<FilterReason, number>;
}

// Needed for Section C: session metrics shape
export interface SessionRateMetrics {
    durationMs:    number;
    durationSec:   number;
    ratePerSec:    number;
    ratePerMin?:   number;
    // Needed for Section E
    distributions: SessionDistributions;
}

// Needed for Section A
export interface SaccadeMetricResult {
    perSaccade:       PerSaccadeDerived[];
    // Needed for Section B
    filtered:         FilterTransparency;
    // Needed for Section C
    session:          SessionRateMetrics;
    // Needed for Section D
    segmentSummaries: SegmentSummary[];
    unassigned:       UnassignedSummary;
    // Needed for Section F
    isiSeries:        number[];
    isiFiltered:      IsiFilterTransparency;
    isiDistributions:  {
        isiMs:        DistributionStats;
    };
    isiHistogram:     IsiHistogram;
    isiBySegment:     IsiSegmentSummary[];
    isiSegmentsMeta:  IsiSegmentsMeta;
} 

// Needed for Section D
export interface SegmentDefinition {
    id:        string;
    startTime: number;
    endTime:   number;
}

// Needed for Section D
export interface SegmentSummary {
    id: string;
    startTime:   number;
    endTime:     number;
    durationMs:  number;
    durationSec: number;
    count:       number;
    ratePerSec:  number;
    ratePerMin?: number;
}

// Needed for Section D
export interface UnassignedSummary {
    count: number;
}

// Needed for Section E
export interface DistributionStats {
    min:    number;
    max:    number;
    mean:   number;
    median: number;
    p10:    number;
    p50:    number;
    p90:    number;
    std:    number;    // Population Standard Deviation
}

// Needed for Section E
export interface SessionDistributions {
    amplitudeDeg: DistributionStats;
}

// Needed for Section E
export type IsiFilterReason = "isi_negative_or_overlap" | "isi_out_of_bounds";

// Transparency for ISI filtering
export interface IsiFilterTransparency {
    totalFiltered: number;
    byReason:      Partial<Record<IsiFilterReason, number>>;
}

// Bounds for ISI plausibility checks
export interface IsiPlausibleBounds {
    isiMs?: PlausibleRange;
}

// Histogram options for ISI (fixed-width bins)
export interface IsiHistogramBinWidthMs {
    binSizeMs: number;
    maxMs:     number;
}

// Histogram output bin shape
export interface IsiHistogramBin {
    startMs: number;
    endMs:   number;
    count:   number;
}

// Histogram output shape
export interface IsiHistogram {
    bins: IsiHistogramBin[];
}

// Segment level ISI summary shape
export interface IsiSegmentSummary {
    id:            string;
    isiSeries:     number[];
    distributions: {
        isiMs:     DistributionStats;
    };
}

// Metadata about ISI segment assignment
export interface IsiSegmentsMeta {
    unassignedIsiCount: number;
}