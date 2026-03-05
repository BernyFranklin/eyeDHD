import type { ParseGazeCsvOptions, ParseMeta, ParseDiagnostics } from "@saccades/ingest/csv/types";
import type { AdapterOptions, AdapterDiagnostics } from "@saccades/adapt/adapter";
import type { SaccadeDetectionOptions } from "@saccades/core/schema";
import type { SaccadeMetricsOptions } from "@saccades/metrics/types";
import type { AnalyzeSaccadesResult } from "@saccades/index";

export interface GazeCsvPipelineOptions {
  parse: Partial<ParseGazeCsvOptions>;
  adapter: Partial<AdapterOptions>;
  detection: Partial<SaccadeDetectionOptions>;
  metrics?: SaccadeMetricsOptions;
}



export interface GazeCsvPipelineResult {
  parse: {
    meta: ParseMeta;
    diagnostics: ParseDiagnostics;
  };
  adapter: {
    diagnostics: AdapterDiagnostics,
    sourceRowIndices: number[];
  };
  analysis: AnalyzeSaccadesResult;
}