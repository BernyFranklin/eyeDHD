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
  options?: Partial<AdapterOptions>
): AdapterResult {

  const includeSet = options?.selection?.includeGazeStatuses                   // If filter provided
    ? new Set(options.selection.includeGazeStatuses)                           // Create a Set for O(1) lookups of included gaze statuses
    : null;

  const vectors: Vec3[] = [];                                                  // Initialize an array to hold the included gaze vectors
  const sourceRowIndices: number[] = [];                                       // To track the original row indices of included vectors

  const includedByGazeStatus: Record<string, number> = {};                     // Track counts of included rows by gaze status
  const excludedByGazeStatus: Record<string, number> = {};                     // Track counts of excluded rows by gaze status

  let excludedByStatusFilter = 0;                                              // Counter for rows excluded by gaze status filter

  for (const r of rows) {                                                      // Iterate through each gaze row 
    const status = r.gazeStatus;                                               // Extract the gaze status from the current row
    const isIncluded = includeSet ? includeSet.has(status) : true;             // Determine if the row should be included based on gaze status filter

    if(isIncluded) {                                                           // If the row passes the gaze status filter (or if no filter is applied)
      vectors.push(r.combinedGazeForward);                                     // Include the gaze vector in the output
      sourceRowIndices.push(r.rowIndex);                                       // Track the source row index for reference
      includedByGazeStatus[r.gazeStatus] =
        (includedByGazeStatus[r.gazeStatus] ?? 0) + 1;                         // Track included counts by gaze status
    } else {                                                                   // If the row is excluded by the gaze status filter
      excludedByStatusFilter++;                                                // Track total excluded by gaze status filter
      excludedByGazeStatus[status] = (excludedByGazeStatus[status] ?? 0) + 1;  // Track excluded counts by gaze status
    }

  }

  const diagnostics: AdapterDiagnostics = {                                    // Compile diagnostics
    totalRows: rows.length,
    includedRows: vectors.length,
    excludedRows: rows.length - vectors.length,
    excludedByReason: {
      gazeStatusFiltered: excludedByStatusFilter,
    },
    includedByGazeStatus,
    excludedByGazeStatus,
  };

  return {                                                                     // Return the adapted vectors along with diagnostics and source row indices
    vectors,
    diagnostics,
    sourceRowIndices,
  };
}