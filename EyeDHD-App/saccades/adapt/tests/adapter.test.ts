import { describe, it, expect } from "vitest";
import type { Vec3 } from "../../index"; 
import type { RawGazeRow } from "../../ingest/csv/types";
import { adaptGazeRowsToAnalysisInput } from "../adapter";

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

describe("Phase 4 - Step 2 Adapter (adaptGazeRowsToAnalysisInput)", () => {
  it("A1 happy path: includes all rows (default policy) and preserves asParsed order", () => {
    const rows: RawGazeRow[] = [
      row(0, 1000, "VALID", { x: 1, y: 0, z: 0 }),
      row(1, 2000, "VALID", { x: 0, y: 1, z: 0 }),
      row(2, 3000, "VALID", { x: 0, y: 0, z: 1 }),
    ];

    const res = adaptGazeRowsToAnalysisInput(rows);

    expect(res.vectors).toEqual([
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ]);

    expect(res.sourceRowIndices).toEqual([0, 1, 2]);

    expect(res.diagnostics.totalRows).toBe(3);
    expect(res.diagnostics.includedRows).toBe(3);
    expect(res.diagnostics.excludedRows).toBe(0);
    expect(res.diagnostics.excludedByReason.gazeStatusFiltered).toBe(0);
  });

  it("A2 policy: filters by includeGazeStatuses and reports transparent counts", () => {
    const rows: RawGazeRow[] = [
      row(0, 1000, "VALID", { x: 1, y: 0, z: 0 }),
      row(1, 2000, "INVALID", { x: 0, y: 1, z: 0 }),
      row(2, 3000, "VALID", { x: 0, y: 0, z: 1 }),
    ];

    const res = adaptGazeRowsToAnalysisInput(rows, {
      selection: { includeGazeStatuses: ["VALID"] },
    });

    expect(res.vectors).toEqual([
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    ]);
    expect(res.sourceRowIndices).toEqual([0, 2]);

    expect(res.diagnostics.totalRows).toBe(3);
    expect(res.diagnostics.includedRows).toBe(2);
    expect(res.diagnostics.excludedRows).toBe(1);
    expect(res.diagnostics.excludedByReason.gazeStatusFiltered).toBe(1);

    expect(res.diagnostics.includedByGazeStatus["VALID"]).toBe(2);
    expect(res.diagnostics.excludedByGazeStatus["INVALID"]).toBe(1);
  });
});