import { analyzeSaccadesFromVectors } from "../index";
import type { AnalyzeSaccadesResult } from "../index";
import { GazeCsvPipelineOptions, GazeCsvPipelineResult } from "./types";

export function runGazeCsvPipeline(
  csvText: string,
  options?: Partial<GazeCsvPipelineOptions>
): GazeCsvPipelineResult {
}