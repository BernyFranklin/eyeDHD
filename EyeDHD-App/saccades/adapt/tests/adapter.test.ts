import { describe, it, expect } from "vitest";
import type { Vec3 } from "../../index"; 
import type { RawGazeRow } from "../../ingest/csv/types";
import { adaptGazeRowsToAnalysisInput } from "../adapter";
import { parseGazeCsvSession } from "../../ingest/csv/index";
import { analyzeSaccadesFromVectors } from "../../index";

function row(
  rowIndex: number,
  captureTimeNs: number,
  gazeStatus: string,
  v: Vec3
): RawGazeRow {
  return {
    rowIndex,
    captureTimeNs,
    gazeStatus,
    combinedGazeForward: v,
  };
}

describe("Saccades Adapter", () => {
  it("A1) Includes all rows (default policy) and preserves asParsed order", () => {
    const rows: RawGazeRow[] = [                                          // Create 3 gaze rows with different gaze statuses and vectors
      row(0, 1000, "VALID", { x: 1, y: 0, z: 0 }),
      row(1, 2000, "VALID", { x: 0, y: 1, z: 0 }),
      row(2, 3000, "VALID", { x: 0, y: 0, z: 1 }),
    ];

    const res = adaptGazeRowsToAnalysisInput(rows);                       // Results include all rows

    expect(res.vectors).toEqual([                                         // Vectors should be included in the same order as input
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ]);

    expect(res.sourceRowIndices).toEqual([0, 1, 2]);                      // Source row indices should match input order

    expect(res.diagnostics.totalRows).toBe(3);                            // Total rows should be 3
    expect(res.diagnostics.includedRows).toBe(3);                         // All rows should be included
    expect(res.diagnostics.excludedRows).toBe(0);                         // No rows should be excluded
    expect(res.diagnostics.excludedByReason.gazeStatusFiltered).toBe(0);  // No rows should be excluded by gaze status filter
  });

  it("A2) Filters by includeGazeStatuses and reports transparent counts", () => {
    const rows: RawGazeRow[] = [                                          // Create 3 gaze rows with different gaze statuses and vectors
      row(0, 1000, "VALID", { x: 1, y: 0, z: 0 }),
      row(1, 2000, "INVALID", { x: 0, y: 1, z: 0 }),
      row(2, 3000, "VALID", { x: 0, y: 0, z: 1 }),
    ];

    const res = adaptGazeRowsToAnalysisInput(rows, {                      // Apply a filter to only include rows with VALID gaze status
      selection: { includeGazeStatuses: ["VALID"] },
    });

    expect(res.vectors).toEqual([                                         // Only VALID rows should be included
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ]);
    expect(res.sourceRowIndices).toEqual([0, 2]);                         // Only rows with VALID status should be included

    expect(res.diagnostics.totalRows).toBe(3);                            // Total rows should be 3
    expect(res.diagnostics.includedRows).toBe(2);                         // Two rows should be included
    expect(res.diagnostics.excludedRows).toBe(1);                         // One row should be excluded
    expect(res.diagnostics.excludedByReason.gazeStatusFiltered).toBe(1);  // One row should be excluded by gaze status filter

    expect(res.diagnostics.includedByGazeStatus["VALID"]).toBe(2);        // Two rows with VALID status should be included
    expect(res.diagnostics.excludedByGazeStatus["INVALID"]).toBe(1);      // One row with INVALID status should be excluded
  });

  it('A3) byCaptureTime sorts by captureTimeNs asc (stable tie-break by rowIndex)', () => {
    const rows: RawGazeRow[] = [                                                    // Create 5 gaze rows with out-of-order capture times and different vectors
      // out of order on purpose
      row(0, 3000, "VALID", { x: 3, y: 0, z: 0 }),
      row(1, 1000, "VALID", { x: 1, y: 0, z: 0 }),
      row(2, 2000, "VALID", { x: 2, y: 0, z: 0 }),

      // same captureTimeNs as rowIndex=3, tie-break should use rowIndex
      row(4, 4000, "VALID", { x: 40, y: 0, z: 0 }),
      row(3, 4000, "VALID", { x: 30, y: 0, z: 0 }),
    ];

    const res = adaptGazeRowsToAnalysisInput(rows, { ordering: "byCaptureTime" });  // Order by captureTimeNs

    expect(res.vectors).toEqual([                                                   // Vectors should be ordered by captureTimeNs
      { x: 1, y: 0, z: 0 },                                                         // t=1000
      { x: 2, y: 0, z: 0 },                                                         // t=2000
      { x: 3, y: 0, z: 0 },                                                         // t=3000
      { x: 30, y: 0, z: 0 },                                                        // t=4000 rowIndex=3 first
      { x: 40, y: 0, z: 0 },                                                        // t=4000 rowIndex=4 second
    ]);

    expect(res.sourceRowIndices).toEqual([1, 2, 0, 3, 4]);                          // Source row indices should reflect the new order after sorting

    expect(res.diagnostics.totalRows).toBe(5);                                      // Total rows should be 5
    expect(res.diagnostics.includedRows).toBe(5);                                   // All rows should be included
    expect(res.diagnostics.excludedRows).toBe(0);                                   // No rows should be excluded
  });

  it("A4) Empty input returns empty vectors and zeroed counts", () => {
    const res = adaptGazeRowsToAnalysisInput([]);                         // Adapt an empty array of gaze rows

    expect(res.vectors).toEqual([]);                                      // No vectors should be included since input is empty
    expect(res.sourceRowIndices).toEqual([]);                             // No source row indices since no rows

    expect(res.diagnostics.totalRows).toBe(0);                            // Total rows should be 0
    expect(res.diagnostics.includedRows).toBe(0);                         // No rows should be included
    expect(res.diagnostics.excludedRows).toBe(0);                         // No rows should be excluded
    expect(res.diagnostics.excludedByReason.gazeStatusFiltered).toBe(0);  // No rows should be excluded by gaze status filter
  });

  it("A5) All filtered out: returns empty vectors and correct exclusion diagnostics", () => {
    const rows: RawGazeRow[] = [                                            // Create 3 gaze rows that will all be filtered out by the gaze status filter
      row(0, 1000, "INVALID", { x: 1, y: 0, z: 0 }),
      row(1, 2000, "INVALID", { x: 0, y: 1, z: 0 }),
      row(2, 3000, "INVALID", { x: 0, y: 0, z: 1 }),
    ];

    const res = adaptGazeRowsToAnalysisInput(rows, {                        // Apply a filter to only include rows with VALID gaze status
      selection: { includeGazeStatuses: ["VALID"] },
    });

    expect(res.vectors).toEqual([]);                                        // No vectors should be included since all rows are filtered out
    expect(res.sourceRowIndices).toEqual([]);                               // No source row indices since no rows are included

    expect(res.diagnostics.totalRows).toBe(3);                              // Total rows should be 3
    expect(res.diagnostics.includedRows).toBe(0);                           // No rows should be included since all are filtered out
    expect(res.diagnostics.excludedRows).toBe(3);                           // All rows should be excluded

    expect(res.diagnostics.excludedByReason.gazeStatusFiltered).toBe(3);    // All rows should be excluded by gaze status filter
    expect(res.diagnostics.includedByGazeStatus["VALID"]).toBeUndefined();  // No rows with VALID status should be included
    expect(res.diagnostics.excludedByGazeStatus["INVALID"]).toBe(3);        // All rows with INVALID status should be excluded
  });

  it('A6) Combo: filters by includeGazeStatuses then applies "byCaptureTime" ordering', () => {
    const rows: RawGazeRow[] = [                                          // Mix VALID/INVALID and out-of-order times
      row(0, 3000, "VALID",   { x: 3, y: 0, z: 0 }),
      row(1, 1000, "INVALID", { x: 9, y: 9, z: 9 }),
      row(2, 2000, "VALID",   { x: 2, y: 0, z: 0 }),
      row(3, 1500, "INVALID", { x: 8, y: 8, z: 8 }),
      row(4, 1000, "VALID",   { x: 1, y: 0, z: 0 }),
    ];

    const res = adaptGazeRowsToAnalysisInput(rows, {                      // First filter to include only VALID gaze statuses, then order by captureTimeNs
      selection: { includeGazeStatuses: ["VALID"] },
      ordering: "byCaptureTime",
    });

    expect(res.vectors).toEqual([                                         // VALID rows are rowIndex 0 (t=3000), 2 (t=2000), 4 (t=1000)
      { x: 1, y: 0, z: 0 },                                               // After ordering by captureTime: rowIndex 4 (t=1000), 2 (t=2000), 0 (t=3000)
      { x: 2, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 },
    ]);

    expect(res.sourceRowIndices).toEqual([4, 2, 0]);                      // Source row indices should reflect the new order after filtering and sorting

    expect(res.diagnostics.totalRows).toBe(5);                            // Total rows should be 5
    expect(res.diagnostics.includedRows).toBe(3);                         // Three rows should be included (VALID)
    expect(res.diagnostics.excludedRows).toBe(2);                         // Two rows should be excluded (INVALID)
    expect(res.diagnostics.excludedByReason.gazeStatusFiltered).toBe(2);  // Two rows should be excluded by gaze status filter

    expect(res.diagnostics.includedByGazeStatus["VALID"]).toBe(3);        // Three rows with VALID status should be included
    expect(res.diagnostics.excludedByGazeStatus["INVALID"]).toBe(2);      // Two rows with INVALID status should be excluded
  });

  it("A7) Determinism: same input + options => identical output; does not mutate input rows", () => {
    const rows: RawGazeRow[] = [                                        // Create 5 gaze rows with a mix of VALID/INVALID statuses and out-of-order capture times
      row(0, 3000, "VALID",   { x: 3, y: 0, z: 0 }),
      row(1, 1000, "INVALID", { x: 9, y: 9, z: 9 }),
      row(2, 2000, "VALID",   { x: 2, y: 0, z: 0 }),
      row(3, 1500, "INVALID", { x: 8, y: 8, z: 8 }),
      row(4, 1000, "VALID",   { x: 1, y: 0, z: 0 }),
    ];

    const originalRowIndexOrder = rows.map(r => r.rowIndex);            // Capture the original order of row indices
    const originalTimeOrder = rows.map(r => r.captureTimeNs);           // Capture the original order of capture times

    const options = {                                                   // Define options to filter by VALID gaze statuses and order by captureTimeNs
      selection: { includeGazeStatuses: ["VALID"] },
      ordering: "byCaptureTime" as const,
    };

    const res1 = adaptGazeRowsToAnalysisInput(rows, options);           // First adaptation with the given rows and options
    const res2 = adaptGazeRowsToAnalysisInput(rows, options);           // Second adaptation with the same rows and options

    expect(res1).toEqual(res2);                                         // The results should be identical for the same input and options, confirming determinism

    // Ensure we didn't mutate the input array ordering
    expect(rows.map(r => r.rowIndex)).toEqual(originalRowIndexOrder);   // Row indices should be in the original order, confirming no mutation
    expect(rows.map(r => r.captureTimeNs)).toEqual(originalTimeOrder);  // Capture times should be in the original order, confirming no mutation
  });
});

describe("Phase 4 integration: Step1 -> Step2 -> analyze", () => {
  it("I1) parses CSV, adapts vectors with policy+ordering, and analyze runs", () => {
    const csvText = [                                                                           // Simulate a CSV session with 5 rows,
      "CaptureTime,GazeStatus,CombinedGazeForwardX,CombinedGazeForwardY,CombinedGazeForwardZ",  // mixing VALID/INVALID gaze statuses and out-of-order capture times
      "3000,VALID,3,0,0",
      "1000,INVALID,9,9,9",
      "2000,VALID,2,0,0",
      "1500,INVALID,8,8,8",
      "1000,VALID,1,0,0",
    ].join("\n");  

    const parsed = parseGazeCsvSession(csvText);                                                // Parse the CSV text into structured rows

    expect(parsed.rows.length).toBe(5);                                                         // Step 1 sanity: we got some rows out

    const adapted = adaptGazeRowsToAnalysisInput(parsed.rows, {                                 // Adapt with a policy to include only VALID gaze statuses and order by captureTimeNs
      selection: { includeGazeStatuses: ["VALID"] },
      ordering: "byCaptureTime",
    });

    expect(adapted.vectors).toEqual([                                                           // Step 2 sanity: filtered then ordered
      { x: 1, y: 0, z: 0 },                                                                     // t=1000 VALID (rowIndex 4 if Step1 uses rowIndex as file row order)
      { x: 2, y: 0, z: 0 },                                                                     // t=2000 VALID
      { x: 3, y: 0, z: 0 },                                                                     // t=3000 VALID
    ]);
    expect(adapted.diagnostics.includedRows).toBe(3);                                           // Should include 3 VALID rows
    expect(adapted.diagnostics.excludedRows).toBe(2);                                           // Should exclude 2 INVALID rows

    expect(() => analyzeSaccadesFromVectors(adapted.vectors)).not.toThrow();                    // Step 3 (analysis) sanity: should not throw

    const analysis = analyzeSaccadesFromVectors(adapted.vectors);                               // Run the full analysis pipeline on the adapted vectors
    expect(analysis).toBeTruthy();                                                              // No assertion on specific analysis results, just runs without error and produces a result object
  });
});