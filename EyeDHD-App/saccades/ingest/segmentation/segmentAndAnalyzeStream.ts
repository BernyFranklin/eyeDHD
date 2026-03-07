import { analyzeSaccadesFromVectors } from '@saccades/index'

export class SegmentMarkerNotFoundError extends Error {
    override name = 'SegmentMarkerNotFoundError' as const;  // For easier identification in tests and error handling
    constructor(
        public readonly segmentId: string,
        public readonly missing: { startMarker?: string; endMarker?: string }
    ) {
        super(`Missing marker(s) for segment "${segmentId}".`);
    }
}

// Local types that will be moved to types.ts later
type Vec3 = { x: number; y: number; z: number };  

export interface TimedVectorStream {  // This is the raw input to our segmentation and analysis pipeline
    timesNs: number[];
    vectors: Vec3[];
    sourceRowIndices?: number[];
}

export type SegmentSpec = 
| { kind: 'timeRange'; id: string; startTimeNs: number; endTimeNs: number }
| { kind: 'markerRange'; id: string; startMarker: string; endMarker: string };  // We will support both time-based and marker-based segmentation

export interface ExperimentMarker {  // This represents a marker event in the experiment, which can be used for marker-based segmentation
    timeNs: number;
    type: string;
    payload?: Record<string, unknown>;
}

export type ClipPolicy = 'clipBounds' | 'requireFullyInside';  // This will determine how we handle vectors that partially overlap with segment boundaries

export interface SegmentAndAnalyzeOptions {
    markers?: ExperimentMarker[];
    detection?: any;  // Placeholder for saccade detection options
    metrics?: any;  // Placeholder for saccade metrics options
    clipPolicy?: ClipPolicy;
}

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

// Entrypoint
export function segmentAndAnalyzeStream(
    stream: TimedVectorStream,
    segmentSpecs: SegmentSpec[],
    options: SegmentAndAnalyzeOptions = {}
): SegmentedAnalysisResult {
    const n = stream.timesNs.length;
    if (stream.vectors.length !== n) {
        throw new Error(
            `TimedVectorStream arrays misaligned: timeNs=${n}, vectors=${stream.vectors.length}`
        );
    }
    if (stream.sourceRowIndices && stream.sourceRowIndices.length !== n) {
        throw new Error(
            `TimedVectorStream arrays misaligned: timesNs=${n}, sourceRowIndices=${stream.sourceRowIndices.length}`
        );
    }

    const segments = segmentSpecs.map((spec) => {
        if (spec.kind === 'timeRange') {
            const startIndex = lowerBound(stream.timesNs, spec.startTimeNs);
            const endIndex = lowerBound(stream.timesNs, spec.endTimeNs);

            const vecSlice = stream.vectors.slice(startIndex, endIndex);
            const analysis = analyzeSaccadesFromVectors(
                vecSlice,
                options.detection,
                options.metrics
            );

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
