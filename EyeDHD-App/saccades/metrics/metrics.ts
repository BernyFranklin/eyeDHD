import type { 
    SaccadeMetricsInput, 
    PerSaccadeDerived, 
    SaccadeMetricResult,
    SaccadeMetricsOptions,
    FilterReason,
    SegmentSummary,
    SegmentDefinition, 
    DistributionStats,
    IsiFilterReason,
    IsiFilterTransparency,
    IsiHistogramBin,
    IsiSegmentSummary,
    SessionSummaryCsvRow
} from "./types";

import { computeDistributionStats } from "./stats";
import { inRange, incPartialCount } from "./filtering";
import { stableChronoSort } from "./ordering";

function segmentIdForStart(
    segments: SegmentDefinition[],
    t: number
): string | null {
        if (segments.length === 0) return null;
        const seg = segments.find(s => t >= s.startTime && t < s.endTime);
        return seg ? seg.id : null;
    }

// Needed for Section A
export function computeSaccadeMetrics(
    input: SaccadeMetricsInput[],
    options: SaccadeMetricsOptions = {}
): SaccadeMetricResult {
    // Needed for Section B
    const bounds = options.plausibleBounds;                         // Bounds for filtering, if provided. If undefined, no filtering will be applied.
    // Needed for Section B
    const filtered = {                                              // Init filter transparency object to track how many saccades are filtered out and for what reasons
        totalFiltered: 0,
        byReason: {
            amplitude_out_of_bounds: 0,
            duration_out_of_bounds: 0
        } as Record<FilterReason, number>,
    };

    // Needed for Section B
    // Derive per-saccade fields WITHOUT mutating inputs
    const derived: PerSaccadeDerived[] = input.map(saccade => {
        const durationMs = saccade.endTime - saccade.startTime;     // Duration in milliseconds is endTime - startTime
        const durationSec = durationMs / 1000;                      // Convert duration to seconds for rate calculation
        // Lock in A3
        const ratePerSec =                                          // Compute rate as amplitude divided by duration in seconds, with safety checks for non-positive durations
            Number.isFinite(durationSec) && durationSec > 0
                ? saccade.amplitudeDeg / durationSec
                : 0;                                                // Handle non-positive durations gracefully

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

    if (!bounds) {                                                  // No bounds provided, keep all derived saccades
        kept.push(...derived);
    }
    else {
        for (const s of derived) {                                  // For each derived saccade, check against bounds and categorize reasons for filtering if applicable
            const reasons: FilterReason[] = [];                     // Init reasons for filtering this saccade, if any. Multiple reasons possible per saccade.
            if (bounds.amplitudeDeg) {                              // Check amplitude bounds if provided
                const { min, max } = bounds.amplitudeDeg;           // Destructure min and max for amplitude bounds
                if (!inRange(s.amplitudeDeg, min, max)) {           // If amplitude is out of bounds, add reason for filtering
                    reasons.push("amplitude_out_of_bounds");
                }
            }
    
            if (bounds.durationMs) {                                // Check duration bounds if provided
                const { min, max } = bounds.durationMs;             // Destructure min and max for duration bounds
                if (!inRange(s.durationMs, min, max)) {             // If duration is out of bounds, add reason for filtering
                    reasons.push("duration_out_of_bounds");
                }
            }
    
            if (reasons.length === 0) {                             // If no reasons for filtering, keep this saccade   
                kept.push(s);
                continue;
            }
    
            filtered.totalFiltered += 1;                            // Increment total filtered count
            for (const r of reasons) {                              // Increment count for each reason this saccade was filtered out
                filtered.byReason[r] += 1;
            }
        }
    }

    // Needed for Section C: compute session duration from kept saccades only
    let sessionDurationMs = 0;                                      // Init session duration to 0

    if (kept.length > 0) {                                          // If we have kept saccades, compute session duration as the span from earliest startTime to latest endTime among kept saccades
        let minStart = kept[0].startTime;                           // Initialize minStart to startTime of first kept saccade
        let maxEnd = kept[0].endTime;                               // Initialize maxEnd to endTime of first kept saccade

        for (const s of kept) {
            if (s.startTime < minStart) minStart = s.startTime;     // Update minStart if this saccade starts earlier
            if (s.endTime > maxEnd) maxEnd = s.endTime;             // Update maxEnd if this saccade ends later
        }
        
        sessionDurationMs = Math.max(0, maxEnd - minStart);         // Clamp to zero for safety
    }

    // Needed for Section C: compute durationSec + ratePerSec
    const sessionDurationSec = sessionDurationMs / 1000;            // Convert session duration to seconds for rate calculation
    const sessionRatePerSec =                                       // Compute session-level rate, with safety checks to prevent division by zero or invalid values
        Number.isFinite(sessionDurationSec) && sessionDurationSec > 0
            ? kept.length / sessionDurationSec
            : 0;
    
    // Needed for Section E: distributions of kept events
    const amplitudeValues = kept.map(s => s.amplitudeDeg);              // Extract amplitude values from kept saccades for distribution stats
    const amplitudeStats = computeDistributionStats(amplitudeValues);   // Compute distribution stats for amplitude using helper function

    // Needed for Section C: build session object
    const session: SaccadeMetricResult["session"] = {
        durationMs: sessionDurationMs,
        durationSec: sessionDurationSec,
        ratePerSec: sessionRatePerSec,

        ...(options.includeRatePerMin
            ? { ratePerMin: sessionRatePerSec * 60 }
            : {}),

        distributions: {
            amplitudeDeg: amplitudeStats
        },
    };

    // Needed for Section D: segment level summaries
    const segments: SegmentDefinition[] = options.segments ?? [];           // Get segment definitions from options, default to empty array if not provided
    const segmentSummaries: SegmentSummary[] = [];                          // Init array to hold summaries for each segment
    const unassigned = {count: 0};                                          // Init count of unassigned saccades that don't fall into any segment

    if (segments.length > 0) {                                              // If we have segment definitions, we need to assign kept saccades to segments and compute segment-level metrics
        // Initialize summaries for every segment
        for (const seg of segments) {                                       // For each segment definition, compute its duration and initialize a summary object with count and rates set to zero. 
            const durationMs = Math.max(0, seg.endTime - seg.startTime);    // Clamp to zero for safety
            const durationSec = durationMs / 1000;                          // Convert duration to seconds for rate calculation
            segmentSummaries.push({                                         // Push new summary object for this segment into the segmentSummaries array
                id: seg.id,
                startTime: seg.startTime,
                endTime: seg.endTime,
                durationMs,
                durationSec,
                count: 0,
                ratePerSec: 0, 
                ...(options.includeRatePerMin ? { ratePerMin: 0 } : {}),
            });
        }
        
        for (const s of kept) {                                                             // Assign each kept saccade by startTime using [start, end) 
            const t = s.startTime;                                                          // Init variable t to the startTime of this saccade for segment assignment 
            const idx = segments.findIndex(seg => t >= seg.startTime && t < seg.endTime);   // Find index of the first segment that this saccade falls into based on its startTime. 

            if (idx === -1) {                                                               // If no segment was found that contains this saccade's startTime, increment the unassigned count.
                unassigned.count += 1;
                continue;
            }

            segmentSummaries[idx].count += 1;                                               // If a segment was found, increment the count of saccades for that segment. 
        }

        
        for (const summary of segmentSummaries) {                   // Compute rates for each segment
            const denomSec = summary.durationSec;                   // Denominator for rate calculation is the duration of the segment in seconds
            summary.ratePerSec =                                    // Compute rate per second for this segment, with safety checks to prevent division by zero or invalid values
                Number.isFinite(denomSec) && denomSec > 0
                    ? summary.count / denomSec
                    : 0;

            if (options.includeRatePerMin) {                        // If the option to include rate per minute is enabled, compute it as rate per second multiplied by 60
                summary.ratePerMin = summary.ratePerSec * 60;
            }
            else {
                delete (summary as any).ratePerMin;                 // Ensure ratePerMin is not included if the option is not enabled, for consistent output shape
            }
        }
    }

    // Needed for Section G: per-saccade rows and series for plotting
    const keptOrdered = stableChronoSort(kept);                     // Get a chronologically stable ordering of the kept saccades for consistent per-saccade output and plotting

    // Needed for Section F
    // 1.) Compute raw ISI series between KEPT saccades
    const isiSeriesRaw: number[] = [];                              // Init array to hold Inter-Saccadic Intervals
    for (let i = 0; i < keptOrdered.length -1; i++) {
        const prev = keptOrdered[i];                                       // Previous saccade in the kept array
        const next = keptOrdered[i + 1];                                   // Next saccade in the kept array

        // ISI definition: time between end of previous and start of next
        const isi = next.startTime - prev.endTime;                  // Compute ISI as the time between the end of the previous saccade and the start of the next saccade
        isiSeriesRaw.push(isi);                                     // Add the computed ISI to the isiSeriesRaw array
    }
    // 2.) Filter ISIs
    const isiFiltered: IsiFilterTransparency = {                    // Init ISI filter transparency object to track how many ISIs are filtered out and for what reasons
        totalFiltered: 0,
        byReason: {},                                               // We will populate this object with counts for each ISI filter reason as we process the ISI series  
    };

    const isiBounds = options.isiPlausibleBounds?.isiMs;            // Get ISI plausible bounds from options, if provided
    const isiSeries: number[] = [];                                 // Init array to hold filtered ISI values that are considered plausible based on provided bounds

    for (const isi of isiSeriesRaw) {                               // For each ISI in the raw series, check against plausible bounds and categorize reasons for filtering if applicable
        const reasons: IsiFilterReason[] = [];                      // Init reasons for filtering this ISI, if any. Multiple reasons possible per ISI.
        
        // Negative ISI means overlap (next starts before prev ends)
        // Also treat non-finite as invalid for safety
        if (!Number.isFinite(isi) || isi < 0) {                    // Check if ISI is negative or non-finite, which indicates an overlap or invalid value. If so, add reason for filtering.
            reasons.push("isi_negative_or_overlap");
        }
        // Optional plausibility bounds for ISI
        if (reasons.length === 0 && isiBounds && Number.isFinite(isi)) {                   // If ISI bounds provided and a finite number, check if it falls within the plausible range. If not, add reason for filtering.
            const { min, max } = isiBounds;                        // Destructure min and max for ISI bounds
            if (!inRange(isi, min, max)) {
                reasons.push("isi_out_of_bounds");
            }
        }

        if (reasons.length === 0) {                                // If no reasons for filtering, keep this ISI   
            isiSeries.push(isi);
            continue;
        }

        isiFiltered.totalFiltered += 1;                            // Increment total filtered count for ISIs
        for (const r of reasons) {                                 // Increment count for each reason this ISI was filtered out
            incPartialCount(isiFiltered.byReason, r);
        }
    }

    // 3.) ISI distribution stats
    const isiStats = computeDistributionStats(isiSeries);          // Compute distribution stats for the filtered ISI series using the helper function

    // 4.) ISI histogram
    const isiHistogramBins: IsiHistogramBin[] = [];                // Init array to hold histogram bins for ISI distribution
    const histCfg = options.isiHistogramBinWidthMs;                // Get histogram configuration from options, if provided

    if (histCfg && histCfg.binSizeMs > 0 && histCfg.maxMs > 0) {   // If histogram configuration provided and valid, compute histogram bins
        const binSize = histCfg.binSizeMs;                         // Bin size in milliseconds from configuration
        const maxMs =   histCfg.maxMs;                             // Maximum ISI in milliseconds to consider for histogram from configuration

        const binCount = Math.floor(maxMs / binSize);              // Compute the number of bins based on max ISI and bin size
        for (let i = 0; i < binCount; i++) {                       // For each bin index, compute the range of ISI values that fall into this bin and count how many ISIs in the series fall in range
            isiHistogramBins.push({
                startMs: i * binSize,                              // Start of bin range in milliseconds
                endMs: (i + 1) * binSize,                          // End of bin range in milliseconds
                count: 0,
            });
        }

        // Bin rule: [startMs, endMs)
        for (const isi of isiSeries) {
            if (!Number.isFinite(isi)) continue;                   // Skip non-finite ISI values for histogram counting
            if (isi < 0 || isi >= maxMs) continue;                 // Skip ISI values that are out of bounds for the histogram

            const idx = Math.floor(isi / binSize);                 // Compute the bin index for this ISI value based on its magnitude and the configured bin size
            if (idx >= 0 && idx < isiHistogramBins.length) {       // If the computed bin index is valid, increment the count for that bin
                isiHistogramBins[idx].count += 1;
            }
        }
    }

    // 5.) ISI per segment
    const isiBySegment: IsiSegmentSummary[] = [];                  // Init array to hold ISI summaries for each segment
    const isiSegmentsMeta = { unassignedIsiCount: 0 };                // Init metadata object to track how many ISIs are unassigned to any segment

    if (options.isiBySegment && segments.length > 0) {
        // Initialize empty segment buckets for all segments
        for (const seg of segments) {
            isiBySegment.push({
                id: seg.id,
                isiSeries: [],
                distributions: {
                    isiMs: { min: 0, max: 0, mean: 0, median: 0, p10: 0, p50: 0, p90: 0, std: 0 },
                },
            });
        }
        // Assign ISIs using the previous saccade's start time
        for (let i = 0; i < kept.length -1; i++) {
            const prev = keptOrdered[i];
            const isi = isiSeriesRaw[i];

            let valid = true;

            if (!Number.isFinite(isi) || isi < 0) valid = false;
            if (valid && isiBounds) {
                const { min, max } = isiBounds;
                if (!inRange(isi, min, max)) valid = false;
            }

            if (!valid) continue;

            const t = prev.startTime;                              // Use the start time of the previous saccade to determine segment assignment for this ISI
            const segIdx = segments.findIndex(seg => t >= seg.startTime && t < seg.endTime);  

            if (segIdx === -1) {
                isiSegmentsMeta.unassignedIsiCount += 1;              // If no segment was found that contains this ISI's reference time, increment the unassigned count in the metadata
                continue; 
            }
            isiBySegment[segIdx].isiSeries.push(isi);              // If a segment was found, add this ISI to the isiSeries array for that segment
        }

        // Compute ISI distributions for each segment
        for (const seg of isiBySegment) {
            seg.distributions.isiMs = computeDistributionStats(seg.isiSeries);   // Compute distribution stats for the ISI series of this segment using the helper function
        }
    }

    const perSaccadeRows = keptOrdered.map((s, idx) => ({
        index: idx,
        startTime: s.startTime,
        endTime: s.endTime,
        durationMs: s.durationMs,
        durationSec: s.durationSec,
        amplitudeDeg: s.amplitudeDeg,
        ratePerSec: s.ratePerSec,
        segmentId: segmentIdForStart(segments, s.startTime),
    }));

    // Needed for G2
    // Plot-ready time series
    const wantsRateSeries = options.series?.saccadeRatePerSecOverTime === true;    // Check if the option to include a time series enabled
    const wantAmpSeries = options.series?.amplitudeDegOverTime === true;           // Check if the option to include an amplitude time series is enabled

    const rateSeries = wantsRateSeries
        ? keptOrdered.map(s => ({ x: s.startTime, y: s.ratePerSec }))
        : [];

        const ampSeries = wantAmpSeries
        ? keptOrdered.map(s => ({ x: s.startTime, y: s.amplitudeDeg }))
        : [];

    const wantsSessionCsv = options.csv?.sessionSummaryRow === true;
    const wantsSegmentCsv = options.csv?.segmentSummaryRows === true;

    const sessionSummaryRow: SessionSummaryCsvRow | null = wantsSessionCsv
        ? ({
            sessionId: null,
            keptCount: kept.length,
            filteredCount: filtered.totalFiltered,
            durationMs: session.durationMs,
            durationSec: session.durationSec,
            ratePerSec: session.ratePerSec,
            ...(options.includeRatePerMin ? { ratePerMin: session.ratePerSec * 60 } : {}),
        } as const)
        : null;

    const segmentSummaryRows = wantsSegmentCsv
        ? segmentSummaries.map(seg => ({
            segmentId: seg.id,
            keptCount: seg.count,
            durationMs: seg.durationMs,
            durationSec: seg.durationSec,
            ratePerSec: seg.ratePerSec,
            ...(options.includeRatePerMin ? { ratePerMin: seg.ratePerSec * 60 } : {}),
        }))
        : [];

    const wantAnySeries =
        options.series?.amplitudeDegOverTime === true ||
        options.series?.saccadeRatePerSecOverTime === true;

    const perSaccadeOut = wantAnySeries ? keptOrdered: kept;

    return {                                                                       // Return SaccadeMetricResult object containing all computed metrics and summaries
        perSaccade: perSaccadeOut, 
        filtered, 
        session,
        segmentSummaries,
        unassigned,
    
        isiSeries,
        isiFiltered,
        isiDistributions: {
            isiMs: isiStats,
        },
        isiHistogram: {
            bins: isiHistogramBins,
        },
        isiBySegment,
        isiSegmentsMeta,

        // Section G
        perSaccadeRows,
        series: {
            saccadeRatePerSecOverTime: rateSeries,
            amplitudeDegOverTime: ampSeries,
        },
        csv: {
            sessionSummaryRow,
            segmentSummaryRows,
        },
    };
}