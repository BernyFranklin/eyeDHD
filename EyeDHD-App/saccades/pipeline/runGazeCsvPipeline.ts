import { analyzeSaccadesFromVectors } from "../index";
import { parseGazeCsvSession } from "../ingest/csv/parseGazeCsvSession";
import { adaptGazeRowsToAnalysisInput } from "../adapt/adapter";
import type { GazeCsvPipelineOptions, GazeCsvPipelineResult } from "./types";

export function runGazeCsvPipeline(
  csvText: string,
  options?: Partial<GazeCsvPipelineOptions>
): GazeCsvPipelineResult {
    const parseOut = parseGazeCsvSession(                     // Parses raw CSV text into structured rows with diagnostics.
        csvText, 
        options?.parse
    );
    const adapterOut = adaptGazeRowsToAnalysisInput(          // Adapts parsed rows into vectors for analysis, applying selection and ordering policies.
        parseOut.rows, 
        options?.adapter
    );
    const includedRows = adapterOut.sourceRowIndices.length;  // Number of rows included after adapter selection
    const excludedRows = parseOut.rows.length - includedRows; // Number of rows excluded by the adapter

    const analysis = analyzeSaccadesFromVectors(              // Analyzes the adapted vectors to detect saccades and compute metrics
        adapterOut.vectors, 
        options?.detection, 
        options?.metrics
    );

    return {                                                  // Return a GazeCsvPipelineResult that includes parse and adapter diagnostics,
        parse: {                                              // source row indices, and analysis results.
            meta: parseOut.meta,
            diagnostics: parseOut.diagnostics,
        },
        adapter: {
            diagnostics: {
                ...adapterOut.diagnostics,
                includedRows,
                excludedRows,
            },
            sourceRowIndices: adapterOut.sourceRowIndices,
        },
        analysis,
    };
}