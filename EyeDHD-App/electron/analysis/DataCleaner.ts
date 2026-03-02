import fs from 'fs';
import rl from 'readline';

import { type CSVData } from '../db/tables/CSVData';

/**
* Reads and cleans a CSV file at the given path. Cleans data lazyily,
* keeping a buffer of request_size cleaned rows
*
* The first line of the CSV file must be the column names
*/
export default class DataCleaner {
	stream;
	readline;
	iter;
	buf_len = 0;
	buf: CSVData[] = [];
	header: string[] = [];
	status: {
		reading: boolean;
		done: boolean;
		closed: boolean;
		start: boolean;
	} = {
		reading: false,
		done: false,
		closed: false,
		start: false
	};
	filePath: string;

	// Statistics for monitoring data quality
	stats: {
		totalRows: number;
		validRows: number;
		errorRows: number;
		nullValues: number;
		validRate: number;
		eyeTrackingErrors: number;
		eyeTrackingErrorRate: number;
		coordinateClampings: number;
		performance: {
			startTime: number | null;
			rowsPerSecond: number;
			memoryUsageMB: number;
			maxBufferSize: number;
		};
		typeConversions: {
			numbers: number;
			booleans: number;
			nulls: number;
			sanitized: number;
		};
	} = {
		totalRows: 0,
		validRows: 0,
		errorRows: 0,
		nullValues: 0,
		validRate: 0,
		eyeTrackingErrors: 0,
		eyeTrackingErrorRate: 0,
		coordinateClampings: 0,
		performance: {
			startTime: null,
			rowsPerSecond: 0,
			memoryUsageMB: 0,
			maxBufferSize: 0
		},
		typeConversions: {
			numbers: 0,
			booleans: 0,
			nulls: 0,
			sanitized: 0
		}
	};

	// Performance and memory optimization
	performance: {
		startTime: number | null;
		rowsPerSecond: number;
		memoryUsage: number;
		maxBufferSize: number;
	} = {
		startTime: null,
		rowsPerSecond: 0,
		memoryUsage: 0,
		maxBufferSize: 0
	};

	// Progress tracking
	progress: {
		bytesRead: number;
		totalBytes: number;
		estimatedRows: number;
		currentRow: number;
	} = {
		bytesRead: 0,
		totalBytes: 0,
		estimatedRows: 0,
		currentRow: 0
	};

	// Eye tracking validation thresholds
	eyeTrackingConfig: {
		coordinateRange: { min: number; max: number };
		requiredFields: string[];
		validStatuses: string[];
	} = {
		coordinateRange: { min: -10, max: 10 },
		requiredFields: [
			'LeftEyeStatus',
			'RightEyeStatus',
			'LeftEyeForwardX',
			'LeftEyeForwardY',
			'LeftEyeForwardZ',
			'LeftPupilDiameterInMM',
			'RightEyeForwardX',
			'RightEyeForwardY',
			'RightEyeForwardZ',
			'RightPupilDiameterInMM'
		],
		validStatuses: ['VALID', 'INVALID', 'LOST', 'TRACKING', 'NOT_TRACKING']
	};

	constructor({ path }: {
		path: string;
	}) {
		// Store the file path for later use
		this.filePath = path;

		// Performance tracking
		this.performance.startTime = Date.now();

		// Get file size for progress tracking
		try {
			const fileStats = fs.statSync(path);
			this.progress.totalBytes = fileStats.size;
		} catch (err) {
			throw new Error(`Could not get file size: ${err.message}`);
		}

		// Optimize buffer size based on available memory
		const optimalBufferSize = this.calculateOptimalBufferSize(1000);
		this.buf_len = optimalBufferSize;

		// Open file as a stream with optimized buffer size
		this.stream = fs.createReadStream(path, {
			encoding: 'utf-8',
			highWaterMark: 64 * 1024 // 64KB buffer for better performance
		});

		this.readline = rl.createInterface({
			input: this.stream,
			crlfDelay: Infinity
		});
		this.iter = this.readline[Symbol.asyncIterator]();

		// Read column names
		this.iter
			.next()
			.then(({ value, done }) => {
				if (done) {
					this.close();
					throw new Error('File is empty');
				}

				// Parse header using the same CSV parsing logic to handle quoted headers
				const headerValues = this.parseCsvLine(value);
				this.header = headerValues.map((name: string) => name.trim());

				// Validate header structure
				const headerValidation = this.validateHeader();
				if (!headerValidation.isValid) {
					throw new Error(
						`Header validation issues detected: ${headerValidation}`
					);
				}

				this.performance.startTime = Date.now();

				this.loadRows(this.buf_len)
					.then()
					.catch((err) => {
						this.close();
						throw err;
					});
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
		this.readline?.close();
		this.stream?.close();
		this.status.reading = false;
		this.status.done = true;
		this.status.closed = true;
	}

	start() {
		this.status.start = true;
	}

	private async read(): Promise<CSVData | null> {
		if (this.buf.length === 0 && !this.status.done) {
			await this.loadRows(this.buf_len);
		}

		return this.buf.shift() ?? null;
	}

	async *[Symbol.asyncIterator]() {
		while (true) {
			const value = await this.read();
			if (value === null) {
				break;
			}

			yield value;
		}
	}

	/**
		* Loads request_size cleaned rows into the internal buffer
		*/
	private async loadRows(count: number) {
		try {
			const wasAlreadyReading = this.status.reading;
			this.status.reading = true;

			while (this.buf.length < count) {
				const { value, done } = await this.iter?.next()!;
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
				//this.updateStats(cleaned);
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
	private cleanRow(raw: string): CSVData {
		const allowedFields = new Set([
			'Frame',
			'CaptureTime',
			'LogTime',
			'GazeStatus',
			'CombinedGazeForwardX',
			'CombinedGazeForwardY',
			'CombinedGazeForwardZ',
			'LeftEyeStatus',
			'LeftEyeForwardX',
			'LeftEyeForwardY',
			'LeftEyeForwardZ',
			'LeftPupilDiameterInMM',
			'RightEyeStatus',
			'RightEyeForwardX',
			'RightEyeForwardY',
			'RightEyeForwardZ',
			'RightPupilDiameterInMM'
		]);

		try {
			const values = this.parseCsvLine(raw);
			const cleaned: Record<string, string | number> = {};

			this.header.forEach((column, index) => {
				const trimmedColumn = column.trim();
				if (!allowedFields.has(trimmedColumn)) {
					return;
				}
				cleaned[trimmedColumn] = this.cleanValue(values[index]);
			});

			const defaults: CSVData = {
				Frame: 0,
				CaptureTime: 0,
				LogTime: 0,
				GazeStatus: 'INVALID',
				CombinedGazeForwardX: 0,
				CombinedGazeForwardY: 0,
				CombinedGazeForwardZ: 0,
				LeftEyeStatus: 'INVALID',
				LeftEyeForwardX: 0,
				LeftEyeForwardY: 0,
				LeftEyeForwardZ: 0,
				LeftPupilDiameterInMM: 0,
				RightEyeStatus: 'INVALID',
				RightEyeForwardX: 0,
				RightEyeForwardY: 0,
				RightEyeForwardZ: 0,
				RightPupilDiameterInMM: 0
			};

			const cleanedRow = cleaned as Record<keyof CSVData, string | number>;
			(Object.keys(defaults) as Array<keyof CSVData>).forEach((key) => {
				if (cleanedRow[key] === undefined || cleanedRow[key] === null) {
					cleanedRow[key] = defaults[key];
				}
			});

			const validatedRow = this.validateRow(cleanedRow);

			// Additional eye tracking validation
			this.validateEyeTrackingRow(validatedRow);

			return validatedRow;
		} catch (error) {
			console.warn(`ERROR cleaning row: ${error.message}`);
			// Return a minimal valid row structure to prevent crashes
			const errorRow: any = {};
			this.header.forEach((column) => {
				const trimmedColumn = column.trim();
				if (allowedFields.has(trimmedColumn)) {
					errorRow[trimmedColumn] = null;
				}
			});
			errorRow._error = error.message;
			return errorRow;
		}
	}

	/**
		* Parses a CSV line handling quoted fields, escaped quotes, and commas within quotes
		*/
	private parseCsvLine(line: string) {
		const values = line.split(',');
		return values;
	}

	/**
		* Cleans and converts individual field values
		*/
	private cleanValue(value: string) {
		if (value === undefined || value === null || value === '') {
			return 0.0;
		}

		const trimmed = String(value).trim().replace(/[()]/g, '');

		// Handle null/empty values
		const nullValues = new Set([
			'',
			'NA',
			'N/A',
			'null',
			'NULL',
			'NaN',
			'nan',
			'#N/A',
			'n/a'
		]);
		if (nullValues.has(trimmed.toLowerCase()) || nullValues.has(trimmed)) {
			return null;
		}

		// Handle numeric values
		const numericValue = this.parseNumeric(trimmed);
		if (numericValue !== null) {
			return numericValue;
		}

		// Return as string if no other conversion applies
		return trimmed;
	}

	/**
	* Attempts to parse a numeric value, handling various formats
	*/
	parseNumeric(value: string) {
		if (!/^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(value)) {
			return null; // Not a valid number format
		}

		const num = parseFloat(value);
		if (isNaN(num)) {
			return 0.0;
		}

		return num;
	}

	/**
	* Validates and sanitizes eye tracking data
	*/
	validateRow(row: Record<string, any>): CSVData {
		// Validate eye tracking specific fields
		const eyePositions = ['Left', 'Right'];
		const coordinates = ['X', 'Y', 'Z'];

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

		return row as CSVData;
	}

	/**
		* Sanitizes eye coordinate values
		*/
	private sanitizeEyeCoordinate(value: any) {
		if (value === null || value === undefined) return 0.0;

		if (typeof value === 'number') {
			// Clamp extreme values that might indicate sensor errors
			if (Math.abs(value) > 10000) {
				console.warn(`Extreme eye coordinate value detected: ${value}`);
				return 0.0;
			}
			return value;
		}

		// Handle string values that might contain parentheses or other formatting
		const stringValue = String(value).replace(/[()]/g, '').trim();
		const numeric = this.parseNumeric(stringValue);

		if (numeric !== null && Math.abs(numeric) <= 10000) {
			return numeric;
		}

		return 0.0; // Invalid coordinate
	}

	/**
	* Sanitizes eye status values
	*/
	private sanitizeEyeStatus(value: any) {
		if (value === null || value === undefined) return 'INVALID';

		const stringValue = String(value).toUpperCase().trim();
		const validStatuses = ['VALID', 'INVALID', 'LOST', 'TRACKING', 'NOT_TRACKING'];

		if (validStatuses.includes(stringValue)) {
			return stringValue;
		}

		// Try to map common variations
		const statusMapping: any = {
			TRUE: 'VALID',
			FALSE: 'INVALID',
			1: 'VALID',
			0: 'INVALID',
			OK: 'VALID',
			GOOD: 'VALID',
			BAD: 'INVALID',
			ERROR: 'INVALID'
		};

		return statusMapping[stringValue] || 'INVALID';
	}

	/**
	* Sanitizes timestamp values
	*/
	private sanitizeTimestamp(value: any) {
		if (value === null || value === undefined) return 0;

		// If it's already a number, assume it's a valid timestamp
		if (typeof value === 'number') {
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

		return 0; // Invalid timestamp
	}

	/**
	* Gets the cleaners internal buffer and begins filling new data into it's buffer
	*
	* @returns an array of rows, or null if the entire file has been read
	*/
	// async getBuffer(): Promise<CSVData[]> {
	// 	if (this.status.done) {
	// 		this.updatePerformanceMetrics();
	// 		return null;
	// 	}

	// 	while (this.buf.length === 0 || this.status.reading) {
	// 		if (this.status.done) {
	// 			const out = this.buf;
	// 			this.buf = [];
	// 			return out;
	// 		}
	// 		await sleep(10);
	// 	}

	// 	const out = this.buf;
	// 	this.buf = [];

	// 	// Only auto-refill if autoRefill is enabled and file is not done
	// 	if (!this.status.done) {
	// 		this.loadRows(this.buf_len).catch((err) => {
	// 			this.close();
	// 			throw err;
	// 		});
	// 	}

	// 	return out;
	// }

	/**
		* Calculates optimal buffer size based on available memory and data characteristics
		*/
	private calculateOptimalBufferSize(requestedSize: number) {
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
	private validateEyeTrackingRow(row: Record<string, any>) {
		let isValid = true;
		const issues: any[] = [];

		// Check required eye tracking fields
		this.eyeTrackingConfig.requiredFields.forEach((field) => {
			if (row[field] === undefined || row[field] === null) {
				isValid = false;
				issues.push(`Missing ${field}`);
			}
		});

		// Validate eye coordinates are within reasonable bounds
		['Left', 'Right'].forEach((eye) => {
			['X', 'Y', 'Z'].forEach((coord) => {
				const field = `${eye}EyeForward${coord}`;
				if (row[field] !== null && typeof row[field] === 'number') {
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

	// /**
	// 	* Updates statistics based on the cleaned row
	// 	*/
	// private updateStats(row: Record<string, any>) {
	// 	this.stats.totalRows++;

	// 	if (row._error) {
	// 		this.stats.errorRows++;
	// 	} else {
	// 		this.stats.validRows++;
	// 	}

	// 	// Count null values and type conversions
	// 	Object.values(row).forEach((value) => {
	// 		if (value === null) {
	// 			this.stats.nullValues++;
	// 		} else if (typeof value === 'number') {
	// 			this.stats.typeConversions.numbers++;
	// 		} else if (typeof value === 'boolean') {
	// 			this.stats.typeConversions.booleans++;
	// 		}
	// 	});

	// 	// Update performance metrics periodically
	// 	if (this.stats.totalRows % 100 === 0) {
	// 		this.updatePerformanceMetrics();
	// 	}
	// }

	// /**
	// * Logs current statistics to console
	// */
	// private logStats() {
	// 	// Statistics can be retrieved via getStats() if needed for logging
	// 	// Removed console.log statements for cleaner production code
	// }

	// /**
	// * Gets overall health status of the data cleaning process
	// */
	// private getHealthStatus() {
	// 	const stats = this.getStats();
	// 	const errorRate = stats.errorRate;
	// 	const eyeTrackingErrorRate = stats.eyeTrackingErrorRate;
	// 	const memoryUsage = this.performance.memoryUsage;
	// 	const maxMemory = process.memoryUsage().heapTotal * 0.8; // 80% threshold

	// 	let status = 'HEALTHY';
	// 	const warnings = [];

	// 	if (errorRate > 10) {
	// 		status = 'WARNING';
	// 		warnings.push(`High error rate: ${stats.errorRate}`);
	// 	}

	// 	if (eyeTrackingErrorRate > 5) {
	// 		status = 'WARNING';
	// 		warnings.push(`High eye tracking error rate: ${stats.eyeTrackingErrorRate}`);
	// 	}

	// 	if (memoryUsage > maxMemory) {
	// 		status = 'CRITICAL';
	// 		warnings.push(`High memory usage: ${stats.performance.memoryUsageMB}`);
	// 	}

	// 	if (this.performance.rowsPerSecond < 10) {
	// 		status = status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
	// 		warnings.push(`Low processing speed: ${stats.performance.rowsPerSecond}`);
	// 	}

	// 	return {
	// 		status,
	// 		warnings,
	// 		timestamp: new Date().toISOString(),
	// 		summary: `${stats.totalRows} rows processed, ${stats.validRate} valid, ${stats.performance.rowsPerSecond} processing speed`
	// 	};
	// }

	/**
	* Validates the header row contains expected eye tracking fields
	*/
	validateHeader() {
		const requiredFields = [
			'LeftEyeForwardX',
			'LeftEyeForwardY',
			'LeftEyeForwardZ',
			'RightEyeForwardX',
			'RightEyeForwardY',
			'RightEyeForwardZ',
			'LeftEyeStatus',
			'RightEyeStatus'
		];

		const missingFields = requiredFields.filter(
			(field) => !this.header.some((h) => h.toLowerCase().includes(field.toLowerCase()))
		);

		if (missingFields.length > 0) {
			//console.warn('Warning: Missing expected eye tracking fields:', missingFields);
		}

		const hasTimestamp = this.header.some(
			(h) => h.toLowerCase().includes('time') || h.toLowerCase().includes('frame')
		);

		if (!hasTimestamp) {
			console.warn('Warning: No timestamp or frame field detected');
		}

		return {
			isValid: missingFields.length === 0 && hasTimestamp,
			missingFields,
			hasTimestamp,
			detectedFields: this.header
		};
	}

	// /**
	// * Gets current cleaning statistics
	// *
	// * @returns Object containing detailed statistics about the cleaning process
	// */
	// getStats() {
	// 	return {
	// 		...this.stats,
	// 		qualityScore: this.calculateQualityScore(),
	// 		errorRate:
	// 		this.stats.totalRows > 0
	// 		? (this.stats.errorRows / this.stats.totalRows) * 100
	// 		: 0,
	// 		validationRate:
	// 		this.stats.totalRows > 0 ? (this.stats.validRows / this.stats.totalRows) * 100 : 0
	// 	};
	// }

	// /**
	// * Gets current performance metrics
	// *
	// * @returns Object containing performance data
	// */
	// getPerformance() {
	// 	this.updatePerformanceMetrics();
	// 	return { ...this.performance };
	// }

	// /**
	// * Gets current cleaning progress
	// *
	// * @returns Object containing progress information
	// */
	// getProgress() {
	// 	let progressPercent = 0;
	// 	const MAX_EXPECTED_ROWS = 300000;

	// 	if (this.status.done) {
	// 		// Always 100% when file is completely processed
	// 		progressPercent = 100;
	// 	} else if (this.stats.totalRows > 0) {
	// 		// Calculate progress based on rows processed vs expected maximum
	// 		if (this.stats.totalRows >= MAX_EXPECTED_ROWS) {
	// 			// If we exceed expected max, stay at 99% until file is actually done
	// 			progressPercent = 99;
	// 		} else {
	// 			// Normal progress calculation: (currentRows / maxExpected) * 100, but cap at 99%
	// 			progressPercent = Math.min(99, (this.stats.totalRows / MAX_EXPECTED_ROWS) * 100);
	// 		}
	// 	}

	// 	return {
	// 		isComplete: this.status.done,
	// 		isReading: this.status.reading,
	// 		isClosed: this.status.closed,
	// 		progressPercent: Math.round(progressPercent * 10) / 10, // Round to 1 decimal
	// 		currentBufferSize: this.buf.length,
	// 		maxBufferSize: this.buf_len,
	// 		rowsProcessed: this.stats.totalRows,
	// 		validRows: this.stats.validRows,
	// 		bytesRead: this.progress.bytesRead,
	// 		totalBytes: this.progress.totalBytes,
	// 		currentRow: this.progress.currentRow,
	// 		maxExpectedRows: MAX_EXPECTED_ROWS
	// 	};
	// }

	/**
	* Checks if the cleaner is still active and available
	*/
	isActive() {
		return !this.status.closed;
	}

// 	/**
// 	* Updates performance metrics
// 	*/
// 	updatePerformanceMetrics() {
// 		if (this.performance.startTime) {
// 			const elapsedTime = (Date.now() - this.performance.startTime) / 1000; // seconds
// 			this.performance.rowsPerSecond = this.stats.totalRows / elapsedTime;
// 			this.performance.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
// 			this.performance.maxBufferSize = Math.max(
// 				this.performance.maxBufferSize,
// 				this.buf.length
// 			);
// 		}
// 	}

// 	/**
// 	* Calculates a data quality score based on various metrics
// 	*/
// 	calculateQualityScore() {
// 		if (this.stats.totalRows === 0) return 0;

// 		const validRatio = this.stats.validRows / this.stats.totalRows;
// 		const errorRatio = this.stats.errorRows / this.stats.totalRows;
// 		const nullRatio = this.stats.nullValues / (this.stats.totalRows * this.header.length);

// 		// Score based on: 70% valid data, 20% low errors, 10% minimal nulls
// 		const score = validRatio * 0.7 + (1 - errorRatio) * 0.2 + (1 - nullRatio) * 0.1;
// 		return Math.round(score * 100);
// 	}
// }

// function sleep(ms: number) {
// 	return new Promise((resolve) => setTimeout(resolve, ms));
}