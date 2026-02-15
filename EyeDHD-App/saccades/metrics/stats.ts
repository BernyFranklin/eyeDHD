import type { DistributionStats } from "./types";

// Deterministic percentile: index = round(p*(n-1)), clamped
function percentileRounded(sorted: number[], p: number): number {
    const n = sorted.length;                            // Assume sorted input for efficiency; caller must ensure this
    if (n === 0) return 0;                              // Guard against empty input
    if (n === 1) return sorted[0];                      // Single value case

    const idx = Math.round(p * (n - 1));                // 0-based index
    const clamped = Math.min(n - 1, Math.max(0, idx));  // Clamp to valid range
    return sorted[clamped];
}

function medianSorted(sorted: number[]): number {
    const n = sorted.length;                        // Assume sorted input for efficiency; caller must ensure this
    if (n === 0) return 0;                          // Guard against empty input
    const mid = Math.floor(n / 2);                  // 0-based index of middle
    if (n % 2 === 1) return sorted[mid];            // Odd length, return middle value
    return (sorted[mid - 1] + sorted[mid]) / 2;     // Even length, average two middle values

}

function populationStd(values: number[], mean: number): number {
    const n = values.length;
    if (n <= 1) return 0;           // Guard against empty input and single value (std=0)
    let sumSq = 0;                  // Sum of squared deviations from mean
    for (const x of values) {
        const d = x -mean;          // Deviation from mean
        sumSq += d*d;               // Accumulate squared deviation
    }
    return Math.sqrt(sumSq / n);    // Population std uses n in denominator
}

export function computeDistributionStats(values: number[]): DistributionStats {
    const finite = values.filter(Number.isFinite);          // Focus on finite numbers for stats, ignore NaN and infinities
    const n = finite.length;                                // Count of valid numbers

    if (n === 0) {                                          // Guard against empty or all non-finite input, return zeros.
        return { min: 0, max: 0, mean: 0, median: 0, p10: 0, p50: 0, p90: 0, std: 0 };
    }

    const sorted = [...finite].sort((a, b) => a - b);       // Sort finite values for percentile and median calculations
    const min = sorted[0];                                  // Minimum is first element in sorted array
    const max = sorted[n - 1];                              // Maximum is last element in sorted array

    let sum = 0;                                            // Init sum for mean calculation
    for (const x of sorted) sum += x;                       // Accumulate sum for mean
    const mean = sum / n;                                   // Compute mean as total sum divided by count

    const median = medianSorted(sorted);                    // Compute median using helper function for clarity
    const p10 = percentileRounded(sorted, 0.10);            // Compute 10th percentile
    const p50 = median;                                     // 50th percentile is the median
    const p90 = percentileRounded(sorted, 0.90);            // Compute 90th percentile

    const std = populationStd(sorted, mean);                // Compute population standard deviation 

    return { min, max, mean, median, p10, p50, p90, std };  // Return all computed stats in a structured object
}