import { AnalyzeSaccadesResult } from '@saccades/index'
import type { Vec3 } from '@saccades/core/velocities'
import type { SaccadeDetectionOptions } from '@saccades/core/schema'
import type { SaccadeMetricsOptions } from '@saccades/metrics/types'

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
export type ClipPolicy = 'clipToBounds' | 'requireFullyInside';  

// Options for the segmentation and analysis process, including saccade detection and metrics parameters
export interface SegmentAndAnalyzeOptions {
    markers?: ExperimentMarker[];
    detection?: Partial<SaccadeDetectionOptions>;  
    metrics?: SaccadeMetricsOptions;  
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
        analysis: AnalyzeSaccadesResult; 
    }>;
}