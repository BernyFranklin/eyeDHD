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

// Helper to build segmemts for both branches
function buildSegment(
    stream: TimedVectorStream,
    id: string,
    startTimeNs: number,
    endTimeNs: number,
    options: SegmentAndAnalyzeOptions
): SegmentedAnalysisResult['segments'][number] {
    // Use binary search to find the indices corresponding to the start and end times of the segment
    const startIndex = lowerBound(stream.timesNs, startTimeNs);
    const endIndex = lowerBound(stream.timesNs, endTimeNs);
    // Depending on the clip policy, we may need to adjust the indices to ensure that we only include vectors that are fully inside the segment bounds
    const vecSlice = stream.vectors.slice(startIndex, endIndex);
    // Perform saccade analysis on the vectors within this segment using the provided options for detection and metrics
    const analysis = analyzeSaccadesFromVectors(vecSlice, options.detection, options.metrics);
    // Construct the segment result object, including the segment ID, bounds, and analysis results. 
    const seg: SegmentedAnalysisResult['segments'][number] = {
        id,
        bounds: {
            startTimeNs,
            endTimeNs,
            startIndex,
            endIndex,
        },
        analysis,
    };
    // If the original stream includes source row indices, we should also slice that array to correspond to the segment's vectors
    if (stream.sourceRowIndices) {
        seg.sourceRowIndices = stream.sourceRowIndices.slice(startIndex, endIndex);
    }
    // Return the constructed segment result
    return seg;
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
            return buildSegment(stream, spec.id, spec.startTimeNs, spec.endTimeNs, options);
        }

        // Marker range 
        // Initialize markers to an empty array if not provided
        const markers = options.markers ?? [];  
        const startMarkerIndex = markers.findIndex(
            (m) => m.type === spec.startMarker
        );
        // Throw error if the start marker is not found in the provided markers
        if (startMarkerIndex === -1) {  
            throw new SegmentMarkerNotFoundError(spec.id, { startMarker: spec.startMarker });
        }
        // If the start marker is found, we then look for the corresponding end marker that comes after it in the markers array
        const startMarker = markers[startMarkerIndex];
        // We need to ensure that the end marker we find comes after the start marker in time
        const endMarker = markers
            .slice(startMarkerIndex + 1) // Only consider markers that come after the start marker
            .find((m) => m.type === spec.endMarker);
        // If we cannot find a valid end marker that comes after the start marker, we throw an error indicating that the end marker is missing
        if (!endMarker) {
            throw new SegmentMarkerNotFoundError(spec.id, { endMarker: spec.endMarker });
        }

        return buildSegment(stream, spec.id, startMarker.timeNs, endMarker.timeNs, options);
    });
    return  { segments };
}
