import fs from "fs";
import rl from "readline";

import { sleep } from "../utils.js";

/**
 * Reads and cleans a CSV file at the given path. Cleans data lazyily,
 * keeping a buffer of buf_len cleaned rows
 *
 * The first line of the CSV file must be the column names
 */
export default class DataCleaner {
  stream;
  readline;
  iter;
  buf_len;
  buf = [];
  header = [];
  status = {
    reading: false,
    done: false,
    closed: false,
  };

  // Statistics for monitoring data quality
  stats = {
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    nullValues: 0,
    eyeTrackingErrors: 0,
    coordinateClampings: 0,
    typeConversions: {
      numbers: 0,
      booleans: 0,
      nulls: 0,
      sanitized: 0,
    },
  };

  // Performance and memory optimization
  performance = {
    startTime: null,
    rowsPerSecond: 0,
    memoryUsage: 0,
    maxBufferSize: 0,
  };

  // Eye tracking validation thresholds
  eyeTrackingConfig = {
    coordinateRange: { min: -10, max: 10 },
    requiredFields: [
      "LeftEyeStatus",
      "RightEyeStatus",
      "LeftEyeForwardX",
      "LeftEyeForwardY",
      "LeftEyeForwardZ",
      "RightEyeForwardX",
      "RightEyeForwardY",
      "RightEyeForwardZ",
    ],
    validStatuses: ["VALID", "INVALID", "LOST", "TRACKING", "NOT_TRACKING"],
  };

  constructor({ path, buf_len = 200 }) {
    // Performance tracking
    this.performance.startTime = Date.now();

    // Optimize buffer size based on available memory
    const optimalBufferSize = this.calculateOptimalBufferSize(buf_len);
    this.buf_len = optimalBufferSize;

    // Open file as a stream with optimized buffer size
    this.stream = fs.createReadStream(path, {
      encoding: "utf-8",
      highWaterMark: 64 * 1024, // 64KB buffer for better performance
    });

    this.readline = rl.createInterface({
      input: this.stream,
      crlfDelay: Infinity,
    });
    this.iter = this.readline[Symbol.asyncIterator]();

    console.log(
      `DataCleaner initialized with buffer size: ${this.buf_len}, path: ${path}`
    );

    // Read column names
    this.iter
      .next()
      .then(({ value, done }) => {
        if (done) {
          this.close();
          throw new Error("File is empty");
        }

        this.header = value.split(",").map((name) => name.trim());

        // Validate header structure
        const headerValidation = this.validateHeader();
        if (!headerValidation.isValid) {
          console.warn("Header validation issues detected:", headerValidation);
        } else {
          console.log(
            "Header validation passed - all required fields detected"
          );
        }
      })
      .catch((err) => {
        this.close();
        throw err;
      });

    // Load first batch of rows
    this.loadRows(this.buf_len)
      .then()
      .catch((err) => {
        this.close();
        throw err;
      });
  }

  /**
   * Closes the file stream and readline interface
   */
  close() {
    if (this.status.closed) {
      return;
    }
    this.readline.close();
    this.stream.close();
    this.status.reading = false;
    this.status.done = true;
    this.status.closed = true;
  }

  /**
   * Loads buf_len cleaned rows into the internal buffer
   */
  async loadRows(count) {
    try {
      this.status.reading = true;

      while (this.buf.length < count) {
        const { value, done } = await this.iter.next();
        if (done) {
          this.status.done = true;
          this.close();
          break;
        }

        const cleaned = this.cleanRow(value);
        this.buf.push(cleaned);
        this.updateStats(cleaned);
      }

      this.status.reading = false;
    } catch (err) {
      this.close();
      throw err;
    }
  }

  /**
   * Cleans a row of CSV data, converting it from a string to JSON
   * Implements proper CSV parsing with type conversion and validation
   */
  cleanRow(raw) {
    try {
      const values = this.parseCsvLine(raw);
      const cleaned = {};

      this.header.forEach((column, index) => {
        if (index < values.length) {
          cleaned[column] = this.cleanValue(values[index]);
        } else {
          cleaned[column] = null; // Handle missing values
        }
      });

      const validatedRow = this.validateRow(cleaned);

      // Additional eye tracking validation
      this.validateEyeTrackingRow(validatedRow);

      return validatedRow;
    } catch (error) {
      console.warn(`ERROR cleaning row: ${error.message}`);
      // Return a minimal valid row structure to prevent crashes
      const errorRow = {};
      this.header.forEach((column) => {
        errorRow[column] = null;
      });
      errorRow._error = error.message;
      return errorRow;
    }
  }

  /**
   * Parses a CSV line handling quoted fields, escaped quotes, and commas within quotes
   */
  parseCsvLine(line) {
    const result = [];
    const str = String(line).replace(/\r$/, ""); // Remove trailing carriage return
    let field = "";
    let inQuotes = false;
    let i = 0;

    while (i < str.length) {
      const char = str[i];
      const nextChar = str[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote within quoted field
          field += '"';
          i += 2; // Skip both quotes
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator outside of quotes
        result.push(field.trim());
        field = "";
        i++;
      } else {
        // Regular character
        field += char;
        i++;
      }
    }

    // Add the last field
    result.push(field.trim());
    return result;
  }

  /**
   * Cleans and converts individual field values
   */
  cleanValue(value) {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = String(value).trim();

    // Handle null/empty values
    const nullValues = new Set([
      "",
      "NA",
      "N/A",
      "null",
      "NULL",
      "NaN",
      "nan",
      "#N/A",
      "n/a",
    ]);
    if (nullValues.has(trimmed.toLowerCase()) || nullValues.has(trimmed)) {
      return null;
    }

    // Handle boolean values
    const trueValues = new Set([
      "true",
      "yes",
      "y",
      "1",
      "on",
      "valid",
      "VALID",
    ]);
    const falseValues = new Set([
      "false",
      "no",
      "n",
      "0",
      "off",
      "invalid",
      "INVALID",
    ]);

    if (trueValues.has(trimmed.toLowerCase()) || trueValues.has(trimmed)) {
      return true;
    }
    if (falseValues.has(trimmed.toLowerCase()) || falseValues.has(trimmed)) {
      return false;
    }

    // Handle numeric values
    const numericValue = this.parseNumeric(trimmed);
    if (numericValue !== null) {
      return numericValue;
    }

    // Handle parentheses around numbers (common in eye tracking data)
    const parenMatch = trimmed.match(/^\(([^)]+)\)$/);
    if (parenMatch) {
      const innerValue = this.parseNumeric(parenMatch[1]);
      return innerValue !== null ? innerValue : trimmed;
    }

    // Return as string if no other conversion applies
    return trimmed;
  }

  /**
   * Attempts to parse a numeric value, handling various formats
   */
  parseNumeric(value) {
    if (!/^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(value)) {
      return null; // Not a valid number format
    }

    const num = parseFloat(value);
    if (isNaN(num)) {
      return null;
    }

    // Return integer if it's a whole number, otherwise return float
    return Number.isInteger(num) ? parseInt(value, 10) : num;
  }

  /**
   * Validates and sanitizes eye tracking data
   */
  validateRow(row) {
    // Validate eye tracking specific fields
    const eyePositions = ["Left", "Right"];
    const coordinates = ["X", "Y", "Z"];

    eyePositions.forEach((position) => {
      // Validate eye forward vectors
      coordinates.forEach((coord) => {
        const field = `${position}EyeForward${coord}`;
        if (row[field] !== undefined && row[field] !== null) {
          const value = this.sanitizeEyeCoordinate(row[field]);
          row[field] = value;
        }
      });

      // Validate eye position coordinates
      coordinates.forEach((coord) => {
        const field = `${position}EyePosition${coord}`;
        if (row[field] !== undefined && row[field] !== null) {
          const value = this.sanitizeEyeCoordinate(row[field]);
          row[field] = value;
        }
      });

      // Validate eye status
      const statusField = `${position}EyeStatus`;
      if (row[statusField] !== undefined) {
        row[statusField] = this.sanitizeEyeStatus(row[statusField]);
      }
    });

    // Validate timestamp fields
    if (row.Timestamp !== undefined && row.Timestamp !== null) {
      row.Timestamp = this.sanitizeTimestamp(row.Timestamp);
    }

    return row;
  }

  /**
   * Sanitizes eye coordinate values
   */
  sanitizeEyeCoordinate(value) {
    if (value === null || value === undefined) return null;

    if (typeof value === "number") {
      // Clamp extreme values that might indicate sensor errors
      if (Math.abs(value) > 10000) {
        console.warn(`Extreme eye coordinate value detected: ${value}`);
        return null;
      }
      return value;
    }

    // Handle string values that might contain parentheses or other formatting
    const stringValue = String(value).replace(/[()]/g, "").trim();
    const numeric = this.parseNumeric(stringValue);

    if (numeric !== null && Math.abs(numeric) <= 10000) {
      return numeric;
    }

    return null; // Invalid coordinate
  }

  /**
   * Sanitizes eye status values
   */
  sanitizeEyeStatus(value) {
    if (value === null || value === undefined) return null;

    const stringValue = String(value).toUpperCase().trim();
    const validStatuses = [
      "VALID",
      "INVALID",
      "LOST",
      "TRACKING",
      "NOT_TRACKING",
    ];

    if (validStatuses.includes(stringValue)) {
      return stringValue;
    }

    // Try to map common variations
    const statusMapping = {
      TRUE: "VALID",
      FALSE: "INVALID",
      1: "VALID",
      0: "INVALID",
      OK: "VALID",
      GOOD: "VALID",
      BAD: "INVALID",
      ERROR: "INVALID",
    };

    return statusMapping[stringValue] || "INVALID";
  }

  /**
   * Sanitizes timestamp values
   */
  sanitizeTimestamp(value) {
    if (value === null || value === undefined) return null;

    // If it's already a number, assume it's a valid timestamp
    if (typeof value === "number") {
      return value;
    }

    const stringValue = String(value).trim();
    const numeric = this.parseNumeric(stringValue);

    if (numeric !== null && numeric > 0) {
      return numeric;
    }

    // Try to parse as date string
    const date = new Date(stringValue);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }

    return null; // Invalid timestamp
  }

  /**
   * Gets a row of cleaned data from the internal buffer
   *
   * @returns a cleaned row, or null if the entire file has been read
   */
  async getRow() {
    try {
      if (this.status.done) {
        return null;
      }

      while (this.buf.length <= 0) {
        await sleep(10);
      }

      const row = this.buf.shift();

      if (this.buf.length <= 0) {
        this.loadRows(this.buf_len).catch((err) => {
          this.close();
          throw err;
        });
      }

      return row;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Gets the cleaners internal buffer and begins filling new data into it's buffer
   *
   * @returns an array of rows, or null if the entire file has been read
   */
  async getBuffer() {
    if (this.status.done) {
      return null;
    }

    while (this.buf.length === 0 || this.status.reading) {
      if (this.status.done) {
        const out = this.buf;
        this.buf = [];
        return out;
      }
      await sleep(10);
    }

    const out = this.buf;
    this.buf = [];

    if (!this.status.done) {
      this.loadRows(this.buf_len).catch((err) => {
        this.close();
        throw err;
      });
    }

    return out;
  }

  /**
   * Calculates optimal buffer size based on available memory and data characteristics
   */
  calculateOptimalBufferSize(requestedSize) {
    const availableMemory = process.memoryUsage().heapTotal;
    const maxBufferMemory = availableMemory * 0.1; // Use max 10% of heap for buffer
    const estimatedRowSize = 2048; // Estimated bytes per row for eye tracking data
    const maxRowsFromMemory = Math.floor(maxBufferMemory / estimatedRowSize);

    const optimalSize = Math.min(requestedSize, maxRowsFromMemory, 1000); // Cap at 1000 rows
    return Math.max(optimalSize, 50); // Minimum 50 rows
  }

  /**
   * Enhanced data validation specifically for eye tracking data
   */
  validateEyeTrackingRow(row) {
    let isValid = true;
    const issues = [];

    // Check required eye tracking fields
    this.eyeTrackingConfig.requiredFields.forEach((field) => {
      if (row[field] === undefined || row[field] === null) {
        isValid = false;
        issues.push(`Missing ${field}`);
      }
    });

    // Validate eye coordinates are within reasonable bounds
    ["Left", "Right"].forEach((eye) => {
      ["X", "Y", "Z"].forEach((coord) => {
        const field = `${eye}EyeForward${coord}`;
        if (row[field] !== null && typeof row[field] === "number") {
          const { min, max } = this.eyeTrackingConfig.coordinateRange;
          if (row[field] < min || row[field] > max) {
            row[field] = Math.max(min, Math.min(max, row[field])); // Clamp value
            this.stats.coordinateClampings++;
            issues.push(`${field} clamped to range [${min}, ${max}]`);
          }
        }
      });

      // Validate eye status
      const statusField = `${eye}EyeStatus`;
      if (
        row[statusField] &&
        !this.eyeTrackingConfig.validStatuses.includes(row[statusField])
      ) {
        issues.push(`Invalid ${statusField}: ${row[statusField]}`);
        isValid = false;
      }
    });

    if (!isValid) {
      this.stats.eyeTrackingErrors++;
      row._validation_issues = issues;
    }

    return isValid;
  }

  /**
   * Enhanced performance monitoring
   */
  updatePerformanceMetrics() {
    const now = Date.now();
    const elapsed = (now - this.performance.startTime) / 1000; // seconds
    this.performance.rowsPerSecond = this.stats.totalRows / elapsed;
    this.performance.memoryUsage = process.memoryUsage().heapUsed;
    this.performance.maxBufferSize = Math.max(
      this.performance.maxBufferSize,
      this.buf.length
    );
  }

  /**
   * Updates statistics based on the cleaned row
   */
  updateStats(row) {
    this.stats.totalRows++;

    if (row._error) {
      this.stats.errorRows++;
    } else {
      this.stats.validRows++;
    }

    // Count null values and type conversions
    Object.values(row).forEach((value) => {
      if (value === null) {
        this.stats.nullValues++;
      } else if (typeof value === "number") {
        this.stats.typeConversions.numbers++;
      } else if (typeof value === "boolean") {
        this.stats.typeConversions.booleans++;
      }
    });

    // Update performance metrics periodically
    if (this.stats.totalRows % 100 === 0) {
      this.updatePerformanceMetrics();
    }
  }

  /**
   * Gets current cleaning statistics
   */
  getStats() {
    this.updatePerformanceMetrics(); // Ensure latest metrics

    return {
      ...this.stats,
      errorRate:
        this.stats.totalRows > 0
          ? ((this.stats.errorRows / this.stats.totalRows) * 100).toFixed(2) +
            "%"
          : "0%",
      validRate:
        this.stats.totalRows > 0
          ? ((this.stats.validRows / this.stats.totalRows) * 100).toFixed(2) +
            "%"
          : "0%",
      eyeTrackingErrorRate:
        this.stats.totalRows > 0
          ? (
              (this.stats.eyeTrackingErrors / this.stats.totalRows) *
              100
            ).toFixed(2) + "%"
          : "0%",
      coordinateClampingRate:
        this.stats.totalRows > 0
          ? (
              (this.stats.coordinateClampings / this.stats.totalRows) *
              100
            ).toFixed(2) + "%"
          : "0%",
      performance: {
        ...this.performance,
        memoryUsageMB:
          (this.performance.memoryUsage / 1024 / 1024).toFixed(2) + "MB",
        rowsPerSecond: this.performance.rowsPerSecond.toFixed(2) + "/sec",
        bufferEfficiency:
          ((this.performance.maxBufferSize / this.buf_len) * 100).toFixed(2) +
          "%",
      },
    };
  }

  /**
   * Logs current statistics to console
   */
  logStats() {
    const stats = this.getStats();
    console.log("=== Enhanced Data Cleaning Statistics ===");
    console.log(`Total Rows Processed: ${stats.totalRows}`);
    console.log(`Valid Rows: ${stats.validRows} (${stats.validRate})`);
    console.log(`Error Rows: ${stats.errorRows} (${stats.errorRate})`);
    console.log(
      `Eye Tracking Errors: ${stats.eyeTrackingErrors} (${stats.eyeTrackingErrorRate})`
    );
    console.log(
      `Coordinate Clampings: ${stats.coordinateClampings} (${stats.coordinateClampingRate})`
    );
    console.log(`Null Values: ${stats.nullValues}`);
    console.log("Type Conversions:");
    console.log(`  - Numbers: ${stats.typeConversions.numbers}`);
    console.log(`  - Booleans: ${stats.typeConversions.booleans}`);
    console.log("Performance Metrics:");
    console.log(`  - Processing Speed: ${stats.performance.rowsPerSecond}`);
    console.log(`  - Memory Usage: ${stats.performance.memoryUsageMB}`);
    console.log(`  - Buffer Efficiency: ${stats.performance.bufferEfficiency}`);
    console.log(`  - Max Buffer Size Used: ${stats.performance.maxBufferSize}`);
    console.log("========================================");
  }

  /**
   * Gets overall health status of the data cleaning process
   */
  getHealthStatus() {
    const stats = this.getStats();
    const errorRate = parseFloat(stats.errorRate);
    const eyeTrackingErrorRate = parseFloat(stats.eyeTrackingErrorRate);
    const memoryUsage = this.performance.memoryUsage;
    const maxMemory = process.memoryUsage().heapTotal * 0.8; // 80% threshold

    let status = "HEALTHY";
    const warnings = [];

    if (errorRate > 10) {
      status = "WARNING";
      warnings.push(`High error rate: ${stats.errorRate}`);
    }

    if (eyeTrackingErrorRate > 5) {
      status = "WARNING";
      warnings.push(
        `High eye tracking error rate: ${stats.eyeTrackingErrorRate}`
      );
    }

    if (memoryUsage > maxMemory) {
      status = "CRITICAL";
      warnings.push(`High memory usage: ${stats.performance.memoryUsageMB}`);
    }

    if (this.performance.rowsPerSecond < 10) {
      status = status === "CRITICAL" ? "CRITICAL" : "WARNING";
      warnings.push(`Low processing speed: ${stats.performance.rowsPerSecond}`);
    }

    return {
      status,
      warnings,
      timestamp: new Date().toISOString(),
      summary: `${stats.totalRows} rows processed, ${stats.validRate} valid, ${stats.performance.rowsPerSecond} processing speed`,
    };
  }

  /**
   * Validates the header row contains expected eye tracking fields
   */
  validateHeader() {
    const requiredFields = [
      "LeftEyeForwardX",
      "LeftEyeForwardY",
      "LeftEyeForwardZ",
      "RightEyeForwardX",
      "RightEyeForwardY",
      "RightEyeForwardZ",
      "LeftEyeStatus",
      "RightEyeStatus",
    ];

    const missingFields = requiredFields.filter(
      (field) =>
        !this.header.some((h) => h.toLowerCase().includes(field.toLowerCase()))
    );

    if (missingFields.length > 0) {
      console.warn(
        "Warning: Missing expected eye tracking fields:",
        missingFields
      );
    }

    const hasTimestamp = this.header.some(
      (h) =>
        h.toLowerCase().includes("time") || h.toLowerCase().includes("frame")
    );

    if (!hasTimestamp) {
      console.warn("Warning: No timestamp or frame field detected");
    }

    return {
      isValid: missingFields.length === 0 && hasTimestamp,
      missingFields,
      hasTimestamp,
      detectedFields: this.header,
    };
  }
}
