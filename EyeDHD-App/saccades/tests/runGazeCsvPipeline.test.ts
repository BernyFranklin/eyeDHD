import { describe, it, expect } from "vitest";
import { runGazeCsvPipeline } from "../pipeline/runGazeCsvPipeline";

// Helper: build CSV text fixtures
function makeCsv(params: {
  header: string[];
  rows: Array<Record<string, string | number>>;
}): string {
  const { header, rows } = params;
  const lines: string[] = [];
  lines.push(header.join(","));
  for (const r of rows) {
    lines.push(header.map(h => String(r[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

describe("Step 3 Orchestrator: runGazeCsvPipeline", () => {
  it("O1 happy path: composes parse -> adapt -> analyze and returns a single pipeline result object", () => {
    const header = [
      "CaptureTime",
      "GazeStatus",
      "CombinedGazeForwardX",
      "CombinedGazeForwardY",
      "CombinedGazeForwardZ",
    ];

    const csvText = makeCsv({
      header,
      rows: [
        { CaptureTime: 0,   GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 5e6, GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 1e7, GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
      ],
    });

    const result = runGazeCsvPipeline(csvText);

    expect(result).toHaveProperty("parse.meta");
    expect(result).toHaveProperty("parse.diagnostics");
    expect(result).toHaveProperty("adapter.diagnostics");
    expect(result).toHaveProperty("adapter.sourceRowIndices");
    expect(Array.isArray(result.adapter.sourceRowIndices)).toBe(true);
    expect(result).toHaveProperty("analysis");
    expect(result.analysis).toHaveProperty("detection");
    expect(result.analysis).toHaveProperty("metrics");
  });

  it("O2 adapter policy passthrough: forwards selection.includeGazeStatuses and ordering", () => {
    const header = [
      "CaptureTime",
      "GazeStatus",
      "CombinedGazeForwardX",
      "CombinedGazeForwardY",
      "CombinedGazeForwardZ",
    ];

    const csvText = makeCsv({
      header,
      rows: [
        { CaptureTime: 1e7, GazeStatus: "VALID",   CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 0,   GazeStatus: "INVALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 5e6, GazeStatus: "VALID",   CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
      ],
    });

    const options = {
      adapter: {
        ordering: "byCaptureTime",
        selection: { includeGazeStatuses: ["VALID"] },
      },
    } as const;

    const result = runGazeCsvPipeline(csvText, options);

    // Expect only VALID rows included
    expect(result.adapter.diagnostics.includedRows).toBe(2);
    expect(result.adapter.diagnostics.excludedRows).toBe(1);
    expect(result.adapter.sourceRowIndices.length).toBe(2);
  });

  it("O3 parse passthrough: forwards parse options to parseGazeCsvSession", () => {
    // TODO: pick ONE real parse option you support in Step 1 (e.g., delimiter/trim/header handling/etc.)
    // and craft a CSV that behaves differently with/without it.
    const csvText = "TODO";

    const resultDefault = runGazeCsvPipeline(csvText);
    const resultWithOpt = runGazeCsvPipeline(csvText, {
      parse: {
        // TODO: put real option(s) here
      },
    });

    // TODO: assert a deterministic difference in parse meta/diagnostics
    expect(resultDefault.parse.diagnostics).not.toEqual(resultWithOpt.parse.diagnostics);
  });

  it("O4 detection passthrough: forwards detectionOptions to analyzeSaccadesFromVectors", () => {
    // TODO: craft vectors via CSV that produce at least one saccade under certain detectionOptions.
    const csvText = "TODO";

    const base = runGazeCsvPipeline(csvText);
    const alt = runGazeCsvPipeline(csvText, {
      detection: {
        // TODO: adjust a threshold that changes detection deterministically
      },
    });

    // TODO: assert detection differs deterministically
    // e.g., saccade count or timestamps differ
    expect(base.analysis.detection).not.toEqual(alt.analysis.detection);
  });

  it("O5 metrics passthrough: forwards metricsOptions to analyzeSaccadesFromVectors", () => {
    const csvText = "TODO";

    const base = runGazeCsvPipeline(csvText);
    const alt = runGazeCsvPipeline(csvText, {
      metrics: {
        // TODO: adjust a metrics option that changes computed metrics deterministically
      } as any,
    });

    expect(base.analysis.metrics).not.toEqual(alt.analysis.metrics);
  });

  it("O6 determinism: same input + options yields identical output", () => {
    const csvText = "TODO";

    const options = {
      parse: { /* TODO */ },
      adapter: { /* TODO */ },
      detection: { /* TODO */ },
      metrics: undefined as any, // TODO: provide actual metricsOptions if required/non-optional
    };

    const a = runGazeCsvPipeline(csvText, options as any);
    const b = runGazeCsvPipeline(csvText, options as any);

    expect(a).toEqual(b);
  });

  it("O7 no mutation: does not mutate options object", () => {
    const csvText = "TODO";

    const options: any = {
      parse: { /* TODO */ },
      adapter: {
        ordering: "asParsed",
        selection: { includeGazeStatuses: ["VALID"] },
      },
      detection: { /* TODO */ },
      metrics: undefined,
    };

    const before = structuredClone(options);
    runGazeCsvPipeline(csvText, options);
    expect(options).toEqual(before);
  });

  it("O8 traceability invariants: sourceRowIndices length matches includedRows and is stable", () => {
    const csvText = "TODO";

    const r1 = runGazeCsvPipeline(csvText, {
      adapter: { selection: { includeGazeStatuses: ["VALID"] } },
    });

    const r2 = runGazeCsvPipeline(csvText, {
      adapter: { selection: { includeGazeStatuses: ["VALID"] } },
    });

    expect(r1.adapter.sourceRowIndices.length).toBe(r1.adapter.diagnostics.includedRows);
    expect(r1.adapter.sourceRowIndices).toEqual(r2.adapter.sourceRowIndices);
  });

  it("O9 all rows filtered: adapter returns empty vectors and analysis is still returned deterministically", () => {
    const header = [
      "CaptureTime",
      "GazeStatus",
      "CombinedGazeForwardX",
      "CombinedGazeForwardY",
      "CombinedGazeForwardZ",
    ];

    const csvText = makeCsv({
      header,
      rows: [
        { CaptureTime: 0,   GazeStatus: "INVALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 5e6, GazeStatus: "INVALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
      ],
    });

    const result = runGazeCsvPipeline(csvText, {
      adapter: { selection: { includeGazeStatuses: ["VALID"] } },
    });

    expect(result.adapter.diagnostics.includedRows).toBe(0);
    expect(result.adapter.sourceRowIndices).toEqual([]);
    expect(result).toHaveProperty("analysis");

    // TODO: define expected empty-input behavior for analyzeSaccadesFromVectors
    // e.g., no saccades
    // expect(result.analysis.detection.saccades).toEqual([]);
  });
});