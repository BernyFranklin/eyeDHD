import fs from "fs";
import rl from "readline";

import { sleep } from "../utils";

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
	buffer_size;
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
		typeConversions: {
			numbers: 0,
			booleans: 0,
			nulls: 0,
			sanitized: 0,
		},
	};

	constructor({ path, buf_len = 200 }) {
		// Open file as a stream and setup line-by-line reading
		this.stream = fs.createReadStream(path, { encoding: "utf-8" });
		this.readline = rl.createInterface({
			input: this.stream,
			crlfDelay: Infinity,
		});
		this.iter = this.readline[Symbol.asyncIterator]();
		this.buffer_size = buf_len;

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
		this.loadRows(this.buffer_size)
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

			return this.validateRow(cleaned);
		} catch (error) {
			console.warn(`Error cleaning row: ${error.message}`, raw);
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
				this.loadRows(this.buffer_size).catch((err) => {
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
			this.loadRows(this.buffer_size).catch((err) => {
				this.close();
				throw err;
			});
		}

		return out;
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
	}

	/**
	 * Gets current cleaning statistics
	 */
	getStats() {
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
		};
	}

	/**
	 * Logs current statistics to console
	 */
	logStats() {
		const stats = this.getStats();
		console.log("=== Data Cleaning Statistics ===");
		console.log(`Total Rows Processed: ${stats.totalRows}`);
		console.log(`Valid Rows: ${stats.validRows} (${stats.validRate})`);
		console.log(`Error Rows: ${stats.errorRows} (${stats.errorRate})`);
		console.log(`Null Values: ${stats.nullValues}`);
		console.log("Type Conversions:");
		console.log(`  - Numbers: ${stats.typeConversions.numbers}`);
		console.log(`  - Booleans: ${stats.typeConversions.booleans}`);
		console.log("================================");
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
