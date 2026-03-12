export interface VisualizationSaccadeInput {
  timeMs: number;
  amplitudeDeg: number;
  segmentId?: string;
  sourceIndex?: number;
}

export interface VisualizationSegmentInput {
  id: string;
  startTimeMs: number;
  endTimeMs: number;
  label?: string;
}

export interface VisualizationEventMarkerInput {
  timeNs: number;
  type: string;
  label?: string;
}

export interface VisualizationPrepInput {
  perSaccade?: VisualizationSaccadeInput[];
  isiValuesMs?: number[];
  markers?: VisualizationEventMarkerInput[];
  segments?: VisualizationSegmentInput[];
}

export interface ScatterPoint {
  timeMs: number;
  amplitudeDeg: number;
  segmentId?: string;
  sourceIndex?: number;
}

export interface ScatterModel {
  points: ScatterPoint[];
}

export interface RateSeriesPoint {
  timeMs: number;      // deterministic bin center
  count: number;
  ratePerSec: number;
}

export interface RateSeriesModel {
  binWidthMs: number;
  points: RateSeriesPoint[];
}

export interface HistogramModel {
  binWidthMs: number;
  binEdges: number[];
  counts: number[];
}

export type VisualizationMarkerKind =
  | 'event'
  | 'segment_start'
  | 'segment_end';

export interface VisualizationMarker {
  kind: VisualizationMarkerKind;
  timeMs: number;
  type: string;
  label?: string;
  segmentId?: string;
}

export interface VisualizationPrepResult {
  scatter: ScatterModel;
  rateSeries: RateSeriesModel;
  isiHistogram: HistogramModel;
  markers: VisualizationMarker[];
}

export interface VisualizationPrepOptions {
  rateBinWidthMs?: number;
  isiBinWidthMs?: number;
  includeMarkers?: boolean;
}