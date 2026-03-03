import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import DataCleaner from '../../analysis/DataCleaner';
import { type TrackingData } from '../../db/tables/TrackingData';

const HEADER = 'Frame,LeftEyeStatus,LeftEyeForwardX,LeftEyeForwardY,LeftEyeForwardZ';
const ROWS = [
	'1,VALID,0.1,0.2,0.3',
	'2,INVALID,0.4,0.5,0.6'
];

describe('Data Analysis - DataCleaner', () => {
	let tempDir: string;
	let tempFile: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eyedhd-cleaner-'));
		tempFile = path.join(tempDir, 'sample.csv');
		fs.writeFileSync(tempFile, [HEADER, ...ROWS].join('\n'), 'utf8');
	});

	afterEach(() => {
		if (fs.existsSync(tempFile)) {
			fs.unlinkSync(tempFile);
		}
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	describe('A) Cleaning', () => {
  		it('A1) yields cleaned rows and closes after completion', async () => {
    		const cleaner = new DataCleaner({ path: tempFile });

      		const results: TrackingData[] = [];
        	for await (const row of cleaner) {
         		results.push(row);
         	}

          	expect(results.length).toBe(ROWS.length);
           	expect(cleaner.status.done).toBe(true);
            cleaner.close();
            expect(cleaner.status.closed).toBe(true);

            // Basic sanity checks on cleaned fields
            expect(results[0].Frame).toBe(1);
            expect(results[0].LeftEyeStatus).toBe('VALID');
    	});
	});

	describe('B) Progress and Stats', () => {
  		it('B1) tracks byte progress and total file size', async () => {
    		const cleaner = new DataCleaner({ path: tempFile });
      		const fileSize = fs.statSync(tempFile).size;

        	for await (const _ of cleaner) {
         		// drain
         	}

          	cleaner.close();

           	expect(cleaner.progress.totalBytes).toBe(fileSize);
            expect(cleaner.progress.bytesRead).toBeGreaterThan(0);
            expect(cleaner.progress.bytesRead).toBeLessThanOrEqual(fileSize);
            expect(cleaner.progress.currentRow).toBe(ROWS.length);
    	});
	});
});