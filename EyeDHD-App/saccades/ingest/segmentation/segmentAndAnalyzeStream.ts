import { analyzeSaccadesFromVectors } from '@saccades/index'
import type { Vec3 } from '@saccades/core/velocities'

export class SegmentMarkerNotFoundError extends Error {
    override name = 'SegmentMarkerNotFoundError' as const;  // For easier identification in tests and error handling
    constructor(
        public readonly segmentId: string,
        public readonly missing: { startMarker?: string; endMarker?: string }
    ) {
        super(`Missing marker(s) for segment "${segmentId}".`);
    }
}

// This is the raw input to our segmentation and analysis pipeline
export interface TimedVectorStream {  
    timesNs: number[];
    vectors: Vec3[];
    sourceRowIndices?: number[];
}

export type SegmentSpec = 
| { kind: 'timeRange'; id: string; startTimeNs: number; endTimeNs: number }
| { kind: 'markerRange'; id: string; startMarker: string; endMarker: string };  // We will support both time-based and marker-based segmentation

// This represents a marker event in the experiment, which can be used for marker-based segmentation
export interface ExperimentMarker {  
    timeNs: number;
    type: string;
    payload?: Record<string, unknown>;
}

// This will determine how we handle vectors that partially overlap with segment boundaries
export type ClipPolicy = 'clipBounds' | 'requireFullyInside';  

// Options for the segmentation and analysis process, including saccade detection and metrics parameters
export interface SegmentAndAnalyzeOptions {
    markers?: ExperimentMarker[];
    detection?: any;  // Placeholder for saccade detection options
    metrics?: any;  // Placeholder for saccade metrics options
    clipPolicy?: ClipPolicy;
}

// The output of our segmentation and analysis process, which includes the segments and their corresponding analysis results
export interface SegmentedAnalysisResult {
    segments: Array<{
        id: string;
        bounds: {
            startTimeNs: number;
            endTimeNs: number;
            startIndex: number;
            endIndex: number;
        };
        sourceRowIndices?: number[];
        analysis: any; // Placeholder for the actual analysis results for this segment
    }>;
}

// A helper function to perform a binary search to find the lower bound index for a given time in the timesNs array.
function lowerBound(arr: number[], x: number): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (arr[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// Entrypoint
export function segmentAndAnalyzeStream(
    stream: TimedVectorStream,
    segmentSpecs: SegmentSpec[],
    options: SegmentAndAnalyzeOptions = {}
): SegmentedAnalysisResult {
    const n = stream.timesNs.length;  // Basic validation to ensure the input stream is well-formed
    // timesNs and vectors arrays must be the same length
    if (stream.vectors.length !== n) {  
        throw new Error(
            `TimedVectorStream arrays misaligned: timeNs=${n}, vectors=${stream.vectors.length}`
        );
    }
    // If sourceRowIndices is provided, it must also be the same length as timesNs and vectors
    if (stream.sourceRowIndices && stream.sourceRowIndices.length !== n) {
        throw new Error(
            `TimedVectorStream arrays misaligned: timesNs=${n}, sourceRowIndices=${stream.sourceRowIndices.length}`
        );
    }
    // For each segment specification, we determine the corresponding indices in the stream and perform saccade analysis on that segment
    const segments = segmentSpecs.map((spec) => {
        if (spec.kind === 'timeRange') {
            const startIndex = lowerBound(stream.timesNs, spec.startTimeNs);
            const endIndex = lowerBound(stream.timesNs, spec.endTimeNs);

            const vecSlice = stream.vectors.slice(startIndex, endIndex);
            // Pass the sliced vectors through our saccade analysis function, along with any relevant options for detection and metrics
            const analysis = analyzeSaccadesFromVectors(  
                vecSlice,
                options.detection,
                options.metrics
            );
            // Construct the segment result
            const seg: SegmentedAnalysisResult['segments'][number] = {
                id: spec.id,
                bounds: {
                    startTimeNs: spec.startTimeNs,
                    endTimeNs: spec.endTimeNs,
                    startIndex,
                    endIndex,
                },
                analysis,
            };
            // If the original stream included sourceRowIndices, we need to slice that as well to maintain alignment with the vectors and times
            if (stream.sourceRowIndices) {
                seg.sourceRowIndices = stream.sourceRowIndices.slice(startIndex, endIndex);
            }

            return seg;
        }

        // Marker range not implemented yet (will be s3/s4)
        throw new Error(`markerRange not implemented yet (segment id="${spec.id}")`);
    });
    return  { segments };
}
