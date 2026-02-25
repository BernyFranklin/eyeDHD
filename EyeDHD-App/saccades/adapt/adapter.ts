import type { Vec3 } from "../index"; 
import type { RawGazeRow } from "../ingest/csv/types";

export interface AdapterSelectionPolicy {
  includeGazeStatuses?: string[];
}

export interface AdapterOptions {
  ordering?: "asParsed" | "byCaptureTime";
  selection?: AdapterSelectionPolicy;
}

export interface AdapterDiagnostics {
  totalRows: number;
  includedRows: number;
  excludedRows: number;
  excludedByReason: {
    gazeStatusFiltered: number;
  };
  includedByGazeStatus: Record<string, number>;
  excludedByGazeStatus: Record<string, number>;
}

export interface AdapterResult {
  vectors: Vec3[];
  diagnostics: AdapterDiagnostics;
  sourceRowIndices: number[];
}

export function adaptGazeRowsToAnalysisInput(
  rows: RawGazeRow[],
  _options?: Partial<AdapterOptions>
): AdapterResult {
  const vectors: Vec3[] = [];
  const sourceRowIndices: number[] = [];

  const includedByGazeStatus: Record<string, number> = {};
  const excludedByGazeStatus: Record<string, number> = {};

  for (const r of rows) {
    vectors.push(r.combinedGazeForward);
    sourceRowIndices.push(r.rowIndex);

    includedByGazeStatus[r.gazeStatus] =
      (includedByGazeStatus[r.gazeStatus] ?? 0) + 1;
  }

  const diagnostics: AdapterDiagnostics = {
    totalRows: rows.length,
    includedRows: rows.length,
    excludedRows: 0,
    excludedByReason: {
      gazeStatusFiltered: 0,
    },
    includedByGazeStatus,
    excludedByGazeStatus,
  };

  return {
    vectors,
    diagnostics,
    sourceRowIndices,
  };
}