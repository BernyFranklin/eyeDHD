import { describe, it, expect, vi } from "vitest";
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

describe("Orchestrator: runGazeCsvPipeline", () => {
  it("O1) Happy path: composes parse -> adapt -> analyze and returns a single pipeline result object", () => {
    const header = [                                                    // Minimal required columns for the pipeline to run without errors.
      "CaptureTime",                                                    // Exact spellings should match real CSV exports.
      "GazeStatus",
      "CombinedGazeForwardX",
      "CombinedGazeForwardY",
      "CombinedGazeForwardZ",
    ];

    const csvText = makeCsv({                                           // Minimal 3-row CSV with valid gaze data at 200 Hz (5ms intervals).
      header,
      rows: [
        { CaptureTime: 0,   GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 5000000, GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 10000000, GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
      ],
    });

    const result = runGazeCsvPipeline(csvText);                         // Store the result for assertions below.

    expect(result).toHaveProperty("parse.meta");                        // Should include parse meta info
    expect(result).toHaveProperty("parse.diagnostics");                 // Should include parse diagnostics
    expect(result).toHaveProperty("adapter.diagnostics");               // Should include adapter diagnostics
    expect(result).toHaveProperty("adapter.sourceRowIndices");          // Should include source row indices
    expect(Array.isArray(result.adapter.sourceRowIndices)).toBe(true);  // sourceRowIndices should be an array
    expect(result).toHaveProperty("analysis");                          // Should include analysis results
    expect(result.analysis).toHaveProperty("detection");                // Should include detection results
    expect(result.analysis).toHaveProperty("metrics");                  // Should include metrics results (even if empty)
  });

  it("O2) Adapter policy passthrough: forwards selection.includeGazeStatuses and ordering", () => {
    const header = [                                          // Set up headers that match what the adapter expects
      "CaptureTime",
      "GazeStatus",
      "CombinedGazeForwardX",
      "CombinedGazeForwardY",
      "CombinedGazeForwardZ",
    ];

    const csvText = makeCsv({                                 // Create a CSV with a mix of VALID and INVALID gaze statuses to test selection filtering.
      header,
      rows: [
        { CaptureTime: 0, GazeStatus: "VALID",   CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 5000000,   GazeStatus: "INVALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 10000000, GazeStatus: "VALID",   CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
      ],
    });

    const options = {                                         // Configure adapter options to include only VALID gaze statuses and order by capture time.
      adapter: {
        ordering: "byCaptureTime",
        selection: { includeGazeStatuses: ["VALID"] },
      },
    } as const;

    const result = runGazeCsvPipeline(csvText, options);      // Run the pipeline with the specified adapter options.

    // Expect only VALID rows included
    expect(result.adapter.diagnostics.includedRows).toBe(2);  // Only the 1st and 3rd rows should be included based on gaze status filter.
    expect(result.adapter.diagnostics.excludedRows).toBe(1);  // The 2nd row should be excluded.
    expect(result.adapter.sourceRowIndices.length).toBe(2);   // sourceRowIndices should reflect the number of included rows.
    expect(result.adapter.sourceRowIndices).toEqual([0, 2]);  // The included rows should be the 1st and 3rd rows (0-based indices).
  });

  it("O3) Parse passthrough: forwards parse options to parseGazeCsvSession", async () => {
    vi.resetModules();                                                                // Reset module registry to ensure fresh imports
    const parseSpy = vi.fn(() => ({                                                   // Mock parseGazeCsvSession output
      rows: [],
      meta: {} as any,
      diagnostics: {} as any,
    }));

    const adapterSpy = vi.fn(() => ({                                                 // Mock adaptGazeRowsToAnalysisInput output
      vectors: [],
      sourceRowIndices: [],
      diagnostics: {
        totalRows: 0,
        includedRows: 0,
        excludedRows: 0,
        excludedByReason: { gazeStatusFiltered: 0 },
        includedByGazeStatus: {},
        excludedByGazeStatus: {},
      },
    }));

    const analyzeSpy = vi.fn(() => ({                                                 // Mock analyzeSaccadesFromVectors output
      detection: {} as any,
      metrics: {} as any, 
    }));

    // Mock Step 1
    vi.doMock("../ingest/csv/parseGazeCsvSession", () => ({
      parseGazeCsvSession: parseSpy,
    }));

    // Mock Step 2
    vi.doMock("../adapt/adapter", () => ({
      adaptGazeRowsToAnalysisInput: adapterSpy,
    }));

    // Mock analysis entry point
    vi.doMock("../index", () => ({
      analyzeSaccadesFromVectors: analyzeSpy,
    }));

    const { runGazeCsvPipeline }  = await import ("../pipeline/runGazeCsvPipeline");  // Import the function under test after setting up mocks

    const csvText = "CaptureTime,GazeStatus,CombinedGazeForwardX,CombinedGazeForwardY,CombinedGazeForwardZ\n";
    const parseOptions = { someParseOption: 123 } as any;                             // Example parse options to verify passthrough

    runGazeCsvPipeline(csvText, { parse: parseOptions });                             // Run the pipeline with the specified parse options

    expect(parseSpy).toHaveBeenCalledTimes(1);                                        // Verify parseGazeCsvSession was called once
    expect(parseSpy).toHaveBeenCalledWith(csvText, parseOptions);                     // Verify it was called with the correct CSV text and parse options
  });
    
  it("O4) Detection passthrough: forwards detectionOptions to analyzeSaccadesFromVectors", async () => {
    vi.resetModules();                                                              // Reset module registry to ensure fresh imports
    const parseSpy = vi.fn(() => ({                                                 // Mock parseGazeCsvSession output
      rows: [{ 
        captureTimeNs: 0,
        gazeStatus: "VALID",
        combinedGazeForward: {
          x: 0,
          y: 0,
          z: 1,
        },
        rowIndex: 0,
      }],
      meta: {} as any,
      diagnostics: {} as any,
    }));  
    const adapterSpy = vi.fn(() => ({                                               // Mock adaptGazeRowsToAnalysisInput output
      vectors: [{ x: 0, y: 0, z: 1 }],
      sourceRowIndices: [0],
      diagnostics: {
        totalRows: 1,
        includedRows: 1,
        excludedRows: 0,
        excludedByReason: { gazeStatusFiltered: 0 },
        includedByGazeStatus: { VALID: 1 },
        excludedByGazeStatus: {},
       },    
    }));

    const analyzeSpy = vi.fn(() => ({                                               // Mock analyzeSaccadesFromVectors output
      detection: {} as any,
      metrics: {} as any,
    }));

    // Mock Step 1
    vi.doMock("../ingest/csv/parseGazeCsvSession", () => ({
      parseGazeCsvSession: parseSpy,
    }));

    // Mock Step 2
    vi.doMock("../adapt/adapter", () => ({
      adaptGazeRowsToAnalysisInput: adapterSpy,
    }));

    // Mock analysis entry point
    vi.doMock("../index", () => ({
      analyzeSaccadesFromVectors: analyzeSpy,
    }));

    const { runGazeCsvPipeline } = await import("../pipeline/runGazeCsvPipeline");  // Import the function under test after setting up mocks
    const csvText = "CaptureTime,GazeStatus,CombinedGazeForwardX,CombinedGazeForwardY,CombinedGazeForwardZ\n" +
                    "0,VALID,0,0,1\n";

    const detectionOptions = { velocityThresholdDegPerSec: 999 } as any;            // Example detection options to verify passthrough
    runGazeCsvPipeline(csvText, { detection: detectionOptions });                   // Run the pipeline with the specified detection options

    expect(analyzeSpy).toHaveBeenCalledTimes(1);                                    // Verify analyzeSaccadesFromVectors was called once
    
    // Signature: (vectors, detectionOptions?, metricsOptions?)
    expect(analyzeSpy).toHaveBeenCalledWith(
      [{ x: 0, y: 0, z: 1 }],                                                       // Vectors adapted from the single CSV row
      detectionOptions,                                                             // Detection options should be passed through correctly
      undefined                                                                     // Metrics options are not provided in this test case
    );
  });

  it("O5) Metrics passthrough: forwards metricsOptions to analyzeSaccadesFromVectors", async () => {
    vi.resetModules();                                                              // Reset module registry to ensure fresh imports

    const parseSpy = vi.fn(() => ({                                                 // Mock parseGazeCsvSession output
      rows: [
        { captureTimeNs: 0, gazeStatus: "VALID", combinedGazeForward: { x: 0, y: 0, z: 1 }, rowIndex: 0 },
      ],
      meta: {} as any,
      diagnostics: {} as any,
    }));
    const adapterSpy = vi.fn(() => ({                                               // Mock adaptGazeRowsToAnalysisInput output
      vectors: [{ x: 0, y: 0, z: 1 }],
      sourceRowIndices: [0],
      diagnostics: {
        totalRows: 1,
        includedRows: 1,
        excludedRows: 0,
        excludedByReason: { gazeStatusFiltered: 0 },
        includedByGazeStatus: { VALID: 1 },
        excludedByGazeStatus: {},
      },
    }));
    const analyzeSpy = vi.fn(() => ({                                               // Mock analyzeSaccadesFromVectors output
      detection: {} as any,
      metrics: {} as any,
    }));

    //Mock Step 1
    vi.doMock("../ingest/csv/parseGazeCsvSession", () => ({
      parseGazeCsvSession: parseSpy,
    }));

    // Mock Step 2
    vi.doMock("../adapt/adapter", () => ({
      adaptGazeRowsToAnalysisInput: adapterSpy,
    }));

    // Mock analysis entry point
    vi.doMock("../index", () => ({
      analyzeSaccadesFromVectors: analyzeSpy,
    }));

    const { runGazeCsvPipeline } = await import("../pipeline/runGazeCsvPipeline");  // Import the function under test after setting up mocks
    const csvText = 
      "CaptureTime,GazeStatus,CombinedGazeForwardX,CombinedGazeForwardY,CombinedGazeForwardZ\n" +
      "0,VALID,0,0,1\n";
    const metricsOptions = { someMetricsOption: true } as any;                      // Example metrics options to verify passthrough
    runGazeCsvPipeline(csvText, { metrics: metricsOptions });                       // Run the pipeline with the specified metrics options

    expect(analyzeSpy).toHaveBeenCalledTimes(1);                                    // Verify analyzeSaccadesFromVectors was called once
    expect(analyzeSpy).toHaveBeenCalledWith(
      [{ x: 0, y: 0, z: 1 }],                                                       // Vectors adapted from the single CSV row
      undefined,                                                                    // Detection options are not provided in this test case
      metricsOptions                                                                // Metrics options should be passed through correctly
    );
  });

  it("O6) Determinism: same input + options yields identical output", () => {
    const header = [                                 // Define the required headers for the CSV input
      "CaptureTime",
      "GazeStatus",
      "CombinedGazeForwardX",
      "CombinedGazeForwardY",
      "CombinedGazeForwardZ",
    ];
    const csvText = makeCsv({                        // Create a CSV string with multiple rows of valid gaze data to test determinism across multiple data points.
      header,
      rows: [
        { CaptureTime: 0, GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 5000000, GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 10000000, GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 15000000, GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
      ],
    });
    const options = {                                // Define adapter options that will be used in both runs to ensure they are identical for the determinism test.
      adapter: {
        ordering: "byCaptureTime",
        selection: { includeGazeStatuses: ["VALID"] },
      },
    } as const;

    const a = runGazeCsvPipeline(csvText, options);  // First run of the pipeline with the specified CSV text and options
    const b = runGazeCsvPipeline(csvText, options);  // Second run of the pipeline with the same CSV text and options

    expect(a).toEqual(b);                            // The outputs of both runs should be deeply equal, confirming determinism.
    expect(a).not.toBe(b);                           // The outputs should not be the same reference, ensuring that the function is not returning cached results.
  });

  it("O7) No mutation: does not mutate options object", () => {
    const header = [                          // Define the required headers for the CSV input
      "CaptureTime",
      "GazeStatus",
      "CombinedGazeForwardX",
      "CombinedGazeForwardY",
      "CombinedGazeForwardZ",
    ];
    const csvText = makeCsv({                 // Create a CSV string with a mix of VALID and INVALID gaze statuses to test that options are not mutated during processing.
      header,
      rows: [
        { CaptureTime: 0, GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 5000000, GazeStatus: "INVALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
        { CaptureTime: 10000000, GazeStatus: "VALID", CombinedGazeForwardX: 0, CombinedGazeForwardY: 0, CombinedGazeForwardZ: 1 },
      ],  
    });

    const options = {                         // Define options with nested objects to verify that they are not mutated by the pipeline.
      parse: {},
      adapter: {
        ordering: "byCaptureTime",
        selection: { includeGazeStatuses: ["VALID"] },
      },
      detection: {},
    } as const;

    const before = structuredClone(options);  // Deep clone the options object before running the pipeline to compare against after execution.
    runGazeCsvPipeline(csvText, options);     // Run the pipeline with the specified CSV text and options
    expect(options).toEqual(before);          // The options object should remain unchanged after the pipeline runs, confirming that there is no mutation.
  });

  it("O8) Traceability invariants: sourceRowIndices length matches includedRows and is stable", () => {
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

  it("O9) All rows filtered: adapter returns empty vectors and analysis is still returned deterministically", () => {
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