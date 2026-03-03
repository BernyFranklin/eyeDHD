import type { Vec3 } from "../index"; 
import type { RawGazeRow } from "../ingest/csv/types";

export interface AdapterSelectionPolicy {
  includeGazeStatuses?: readonly string[];
}

export interface AdapterOptions {
  ordering?: "asParsed" | "byCaptureTime";
  selection?: AdapterSelectionPolicy;
}

export interface AdapterDiagnostics {
  totalRows:    number;
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

  const ordering = options?.ordering ?? "asParsed";                            // Default to "asParsed" if no ordering option is provided

  const includedRows: RawGazeRow[] = [];                                       // This will hold the rows that pass the gaze status filter
  
  
  const includedByGazeStatus: Record<string, number> = {};                     // Track counts of included rows by gaze status
  const excludedByGazeStatus: Record<string, number> = {};                     // Track counts of excluded rows by gaze status
  
  let excludedByStatusFilter = 0;                                              // Counter for rows excluded by gaze status filter
  
  for (const r of rows) {                                                      // Iterate through each gaze row 
    const status = r.gazeStatus;                                               // Extract the gaze status from the current row
    const isIncluded = includeSet ? includeSet.has(status) : true;             // Determine if the row should be included based on gaze status filter
    
    if(isIncluded) {                                                           // If the row passes the gaze status filter (or if no filter is applied)
      includedRows.push(r);                                                    // Include the row in the includedRows array
      includedByGazeStatus[r.gazeStatus] =
      (includedByGazeStatus[r.gazeStatus] ?? 0) + 1;                           // Track included counts by gaze status
    } else {                                                                   // If the row is excluded by the gaze status filter
      excludedByStatusFilter++;                                                // Track total excluded by gaze status filter
      excludedByGazeStatus[status] = (excludedByGazeStatus[status] ?? 0) + 1;  // Track excluded counts by gaze status
    }
    
  }
  
  if (ordering === "byCaptureTime") {                                          // If ordering by capture time is requested
    includedRows.sort((a, b) => {                                              // Sort the included rows by captureTimeNs ascending
      const dt = a.captureTimeNs - b.captureTimeNs;                            // dt is the difference in capture times
      if (dt !== 0) return dt;                                                 // If capture times are different, sort by that
      return a.rowIndex - b.rowIndex;                                          // If capture times are the same, sort by rowIndex
    })
  }
  
  const vectors: Vec3[] = includedRows.map(r => r.combinedGazeForward);        // Extract the combinedGazeForward vector from each included row
  const sourceRowIndices: number[] = includedRows.map(r => r.rowIndex);        // Keep track of the original row indices for the included rows

  return {                                                                     // Return the adapted vectors along with diagnostics and source row indices
    vectors,
    diagnostics: {
      totalRows: rows.length,
      includedRows: includedRows.length,
      excludedRows: rows.length - includedRows.length,
      excludedByReason: {
        gazeStatusFiltered: excludedByStatusFilter,
      },
      includedByGazeStatus,
      excludedByGazeStatus,
    },
    sourceRowIndices,
  };
}