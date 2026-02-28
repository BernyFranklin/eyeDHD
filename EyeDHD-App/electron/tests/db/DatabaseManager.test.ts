import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import DatabaseManager from '../../db/DatabaseManager';
import { caseImportCsvPath } from '../../db/tables/CaseData';

import { type Progress, type StreamKey, type DataType } from '../../db/DataStream';

type PullResult = {
	rows: DataType[];
	progress: Progress;
};

async function pullOnce(
	dbmgr: DatabaseManager,
	key: StreamKey,
	count = 1
): Promise<PullResult> {
	return new Promise((resolve, reject) => {
		dbmgr
			.pullStream(key, count, (rows, progress) => resolve({ rows, progress }))
			.catch(reject);
	});
}

function createTempCsv(lines: string[]): { filePath: string; filename: string; rowCount: number } {
	const filename = `test_${Date.now()}_${Math.random().toString(36).slice(2)}.csv`;
	const filePath = path.join(os.tmpdir(), filename);
	fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
	return { filePath, filename, rowCount: Math.max(lines.length - 1, 0) };
}

describe('Database - Manager', () => {
	describe('A) CaseData streaming', () => {
		it('A1) Streams metadata in batches and reports row progress', async () => {
			const dbmgr = new DatabaseManager({ temporary: true, logging: false });
			const createdFiles: string[] = [];

			try {
				const csv1 = createTempCsv(['a,b,c', '1,2,3']);
				const csv2 = createTempCsv(['a,b,c', '4,5,6', '7,8,9']);
				createdFiles.push(csv1.filePath, csv2.filePath);

				const db = dbmgr['db'];
				db.prepare(`
						INSERT INTO CaseData (name, path)
						VALUES (?, ?);
					`)
					.run(csv1.filename, csv1.filePath);

				db.prepare(`
						INSERT INTO CaseData (name, path)
						VALUES (?, ?);
					`)
					.run(csv2.filename, csv2.filePath);

				const streamKey = await dbmgr.startStream('CaseData');
				const { rows, progress } = await pullOnce(dbmgr, streamKey, 1);

				expect(rows.length).toBeGreaterThanOrEqual(2);
				expect(progress.rows).toBe(rows.length);
				expect(progress.done).toBe(false);

				dbmgr.cancelStream(streamKey);
			} finally {
				dbmgr.close();
				createdFiles.forEach((p) => {
					if (fs.existsSync(p)) fs.unlinkSync(p);
				});
			}
		});
	});

	describe('B) Cleaning streaming', () => {
		it('B1) Streams cleaning batches and exposes byte-based progress', async () => {
			const dbmgr = new DatabaseManager({ temporary: true, logging: false });
			let createdFilePath = '';
			let caseDir = '';

			try {
				const csv = createTempCsv([
					'Frame,CaptureTime,LogTime,GazeStatus,CombinedGazeForwardX,CombinedGazeForwardY,CombinedGazeForwardZ,LeftEyeStatus,LeftEyeForwardX,LeftEyeForwardY,LeftEyeForwardZ,LeftPupilDiameterInMM,RightEyeStatus,RightEyeForwardX,RightEyeForwardY,RightEyeForwardZ,RightPupilDiameterInMM',
					'1,100,200,VALID,0,0,1,VALID,0,0,1,4,VALID,0,0,1,4',
					'2,101,201,VALID,0,0,1,VALID,0,0,1,4,VALID,0,0,1,4',
					'3,102,202,VALID,0,0,1,VALID,0,0,1,4,VALID,0,0,1,4'
				]);
				createdFilePath = csv.filePath;

				const caseName = path.parse(csv.filename).name;
				caseDir = path.join(os.tmpdir(), `case_${Date.now()}_${Math.random().toString(36).slice(2)}`);
				fs.mkdirSync(path.join(caseDir, 'imports'), { recursive: true });

				const metadata = dbmgr.createCase(caseName, caseDir);
				const importPath = caseImportCsvPath(metadata);
				fs.copyFileSync(csv.filePath, importPath);

				const readyMetadata = dbmgr.actions.case.resetCleaning(metadata);
				const streamKey = await dbmgr.startStream('Cleaning', readyMetadata);

				let lastProgress: Progress | null = null;

				for (let i = 0; i < 20; i++) {
					const { progress } = await pullOnce(dbmgr, streamKey, 1);
					lastProgress = progress;

					if (progress.done) {
						break;
					}
				}

				expect(lastProgress).not.toBeNull();
				expect(lastProgress?.done).toBe(true);

				expect(lastProgress?.bytesRead).toBeDefined();
				expect(lastProgress?.totalBytes).toBeDefined();
				expect(lastProgress?.bytesRead).toBeGreaterThan(0);
				expect(lastProgress?.totalBytes).toBeGreaterThan(0);
				expect((lastProgress?.bytesRead ?? 0) <= (lastProgress?.totalBytes ?? 0)).toBe(true);

				dbmgr.cancelStream(streamKey);
			} finally {
				dbmgr.close();
				if (createdFilePath && fs.existsSync(createdFilePath)) {
					fs.unlinkSync(createdFilePath);
				}
				if (caseDir && fs.existsSync(caseDir)) {
					fs.rmSync(caseDir, { recursive: true, force: true });
				}
			}
		});
	});
});