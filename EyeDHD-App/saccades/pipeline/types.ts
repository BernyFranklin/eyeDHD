import type { ParseGazeCsvOptions, ParseMeta, ParseDiagnostics } from "../ingest/csv/types";
import type { AdapterOptions, AdapterDiagnostics } from "../adapt/adapter";
import type { SaccadeDetectionOptions } from "../core/schema";
import type { SaccadeMetricsOptions } from "../metrics/types";
import type { AnalyzeSaccadesResult } from "../index";

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