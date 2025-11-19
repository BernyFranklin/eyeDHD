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
    autoRefill: true, // Controls whether getBuffer() automatically refills
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

  // Progress tracking
  progress = {
    bytesRead: 0,
    totalBytes: 0,
    estimatedRows: 0,
    currentRow: 0,
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
      "LeftPupilDiameterInMM",
      "LeftIrisDiameterInMM",
      "RightEyeForwardX",
      "RightEyeForwardY",
      "RightEyeForwardZ",
      "RightPupilDiameterInMM",
      "RightIrisDiameterInMM",
    ],
    validStatuses: ["VALID", "INVALID", "LOST", "TRACKING", "NOT_TRACKING"],
  };

  constructor({ path, buf_len = 200, autoStart = true }) {
    // Store the file path for later use
    this.filePath = path;
    
    // Performance tracking
    this.performance.startTime = Date.now();

    // Set auto-refill behavior based on autoStart
    this.status.autoRefill = autoStart;

    // Get file size for progress tracking
    try {
      const fileStats = fs.statSync(path);
      this.progress.totalBytes = fileStats.size;
    } catch (err) {
      console.warn('Could not get file size:', err);
      this.progress.totalBytes = 0;
    }

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

    // Read column names
    this.iter
      .next()
      .then(({ value, done }) => {
        if (done) {
          this.close();
          throw new Error("File is empty");
        }

        // Parse header using the same CSV parsing logic to handle quoted headers
        const headerValues = this.parseCsvLine(value);
        this.header = headerValues.map((name) => name.trim());

        // Validate header structure
        const headerValidation = this.validateHeader();
        if (!headerValidation.isValid) {
          console.warn("Header validation issues detected:", headerValidation);
        }
        
        // Only auto-load rows if autoStart is true
        if (autoStart) {
          this.loadRows(this.buf_len)
            .then()
            .catch((err) => {
              this.close();
              throw err;
            });
        }
      })
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
      const wasAlreadyReading = this.status.reading;
      this.status.reading = true;

      while (this.buf.length < count) {
        const { value, done } = await this.iter.next();
        if (done) {
          this.status.done = true;
          // Only set reading to false if we weren't already in a cleaning process
          if (!wasAlreadyReading) {
            this.status.reading = false;
          }
          break;
        }

        // Track bytes read for progress calculation
        this.progress.bytesRead += Buffer.byteLength(value, 'utf8');
        this.progress.currentRow++;

        const cleaned = this.cleanRow(value);
        this.buf.push(cleaned);
        this.updateStats(cleaned);
      }
      
      // Only set reading to false if we weren't already in a cleaning process
      if (!wasAlreadyReading) {
        this.status.reading = false;
      }
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

    // Only auto-refill if autoRefill is enabled and file is not done
    if (!this.status.done && this.status.autoRefill) {
      this.loadRows(this.buf_len).catch((err) => {
        this.close();
        throw err;
      });
    }

    return out;
  }

  /**
   * Starts the data cleaning process by loading all remaining rows
   * This method can be called to actively clean the entire file
   *
   * @returns Promise that resolves when cleaning is complete
   */
  async startCleaning() {
    try {

      
      // Enable auto-refill for full cleaning
      this.status.autoRefill = true;
      
      this.performance.startTime = Date.now();
      
      // If file is already done, just return success
      if (this.status.done) {
        //console.log('File already processed completely!');
        this.updatePerformanceMetrics();
        return { success: true, message: 'File was already cleaned' };
      }
      
      // Set reading status to true for the entire cleaning process
      this.status.reading = true;
      
      // Continue loading rows until file is complete
      while (!this.status.done) {
        //console.log('Loop iteration - status.done:', this.status.done, 'buffer length:', this.buf.length);
        
        // If buffer is not full and we're not done, load more rows
        if (this.buf.length < this.buf_len && !this.status.done) {
          //console.log('Loading more rows...');
          await this.loadRows(this.buf_len);
          //console.log('After loadRows - status.done:', this.status.done, 'buffer length:', this.buf.length);
        } else if (!this.status.done) {
          // If buffer is full but file isn't done, clear buffer to continue processing
          //console.log('Buffer full, clearing to continue processing...');
          this.buf = [];
        }
        
        //await sleep(50); // Slow down processing to see progress (remove for production)
      }
      
      // Set reading to false when completely done
      this.status.reading = false;
      

      this.updatePerformanceMetrics();
      return { success: true, message: 'Cleaning completed successfully' };
    } catch (error) {
      this.status.reading = false;
      console.error('Error during cleaning process:', error);
      throw error;
    }
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
    // Statistics can be retrieved via getStats() if needed for logging
    // Removed console.log statements for cleaner production code
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

  /**
   * Gets current cleaning statistics
   *
   * @returns Object containing detailed statistics about the cleaning process
   */
  getStats() {
    return {
      ...this.stats,
      qualityScore: this.calculateQualityScore(),
      errorRate: this.stats.totalRows > 0 ? (this.stats.errorRows / this.stats.totalRows) * 100 : 0,
      validationRate: this.stats.totalRows > 0 ? (this.stats.validRows / this.stats.totalRows) * 100 : 0
    };
  }

  /**
   * Gets current performance metrics
   *
   * @returns Object containing performance data
   */
  getPerformance() {
    this.updatePerformanceMetrics();
    return { ...this.performance };
  }

  /**
   * Gets current cleaning progress
   *
   * @returns Object containing progress information
   */
  getProgress() {
    let progressPercent = 0;
    const MAX_EXPECTED_ROWS = 300000;
    
    if (this.status.done) {
      // Always 100% when file is completely processed
      progressPercent = 100;
    } else if (this.stats.totalRows > 0) {
      // Calculate progress based on rows processed vs expected maximum
      if (this.stats.totalRows >= MAX_EXPECTED_ROWS) {
        // If we exceed expected max, stay at 99% until file is actually done
        progressPercent = 99;
      } else {
        // Normal progress calculation: (currentRows / maxExpected) * 100, but cap at 99%
        progressPercent = Math.min(99, (this.stats.totalRows / MAX_EXPECTED_ROWS) * 100);
      }
    }
    
    return {
      isComplete: this.status.done,
      isReading: this.status.reading,
      isClosed: this.status.closed,
      progressPercent: Math.round(progressPercent * 10) / 10, // Round to 1 decimal
      currentBufferSize: this.buf.length,
      maxBufferSize: this.buf_len,
      rowsProcessed: this.stats.totalRows,
      validRows: this.stats.validRows,
      bytesRead: this.progress.bytesRead,
      totalBytes: this.progress.totalBytes,
      currentRow: this.progress.currentRow,
      maxExpectedRows: MAX_EXPECTED_ROWS,
    };
  }

  /**
   * Checks if the cleaner is still active and available
   */
  isActive() {
    return !this.status.closed;
  }

  /**
   * Updates performance metrics
   */
  updatePerformanceMetrics() {
    if (this.performance.startTime) {
      const elapsedTime = (Date.now() - this.performance.startTime) / 1000; // seconds
      this.performance.rowsPerSecond = this.stats.totalRows / elapsedTime;
      this.performance.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      this.performance.maxBufferSize = Math.max(this.performance.maxBufferSize, this.buf.length);
    }
  }

  /**
   * Calculates a data quality score based on various metrics
   */
  calculateQualityScore() {
    if (this.stats.totalRows === 0) return 0;
    
    const validRatio = this.stats.validRows / this.stats.totalRows;
    const errorRatio = this.stats.errorRows / this.stats.totalRows;
    const nullRatio = this.stats.nullValues / (this.stats.totalRows * this.header.length);
    
    // Score based on: 70% valid data, 20% low errors, 10% minimal nulls
    const score = (validRatio * 0.7) + ((1 - errorRatio) * 0.2) + ((1 - nullRatio) * 0.1);
    return Math.round(score * 100);
  }

  /**
   * Exports all cleaned data to a new CSV file
   *
   * @param {string} outputPath - The path where to save the cleaned CSV file
   * @returns {Promise<Object>} - Result object with success status and message
   */
  async exportToCSV(outputPath) {
    try {
      // Create a new stream to read through the entire file for export
      const exportStream = fs.createReadStream(this.filePath);
      const exportReadline = rl.createInterface({
        input: exportStream,
        crlfDelay: Infinity
      });

      let csvContent = '';
      let isFirstLine = true;
      let exportedRows = 0;
      
      // Add header row
      csvContent += this.header.map(col => `"${col.replace(/"/g, '""')}"`).join(',') + '\n';
      
      // Read through the entire file and clean each row for export
      for await (const line of exportReadline) {
        if (isFirstLine) {
          isFirstLine = false;
          continue; // Skip header line
        }

        if (line.trim()) {
          try {
            // Clean the row using the same logic as loadRows
            const cleaned = this.cleanRow(line);
            
            // Only include valid rows (not error rows)
            if (cleaned && !cleaned._isError) {
              const csvRow = this.header.map(col => {
                const value = cleaned[col];
                if (value === null || value === undefined) {
                  return '';
                }
                // Escape quotes and wrap in quotes if contains comma, quote, or newline
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                  return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
              }).join(',');
              csvContent += csvRow + '\n';
              exportedRows++;
            }
          } catch (error) {
            // Skip invalid rows during export
            continue;
          }
        }
      }

      // Close the export stream
      exportStream.close();

      // Write to file
      await fs.promises.writeFile(outputPath, csvContent, 'utf8');
      
      return {
        success: true,
        message: `Successfully exported ${exportedRows} cleaned rows to ${outputPath}`,
        stats: {
          totalExported: exportedRows,
          filePath: outputPath,
          fileSize: csvContent.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to export CSV: ${error.message}`,
        error: error
      };
    }
  }
}
