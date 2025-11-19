

import { dialog, ipcMain, Notification } from 'electron';
import { getDb } from '../models/dbmgr.js';
import { parse } from 'csv-parse/sync';
import { app } from 'electron';

import path from 'path';

import fs from 'fs';

import { filesMap } from './store.js';
import DataCleaner from './stuff/DataCleaner.js';

const TABLE = 'EyeDataRaw';

/**
 * Handles the csv-open-file request. Opens a file selector and begins cleaning it if one is selected
 *
 * @returns filename if a file is selector, or null if none are selected
 */
ipcMain.handle('csv-open-file', async (_, bufferSize) => {
    return new Promise(async (resolve, reject) => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'CSV Files', extensions: ['csv'] }]
        });

        if (canceled) {
            return resolve(null);
        }

        const filepath = filePaths[0];
        const filename = path.basename(filepath);

        // If file is already opened and cleaning, just return filename
        if (filesMap.has(filename)) {
            return resolve(filename);
        }

        // Create cleaner but don't start automatic processing
        // We'll only process when the user explicitly requests cleaning
        const cleaner = new DataCleaner({
            path: filepath,
            buf_len: bufferSize,
            autoStart: false // Don't auto-process the entire file
        });

        filesMap.set(filename, cleaner);
        return resolve(filename);
    });
});

/**
 * Handles the csv-close-file request. Closes the cleaner for filename
 */
ipcMain.handle('csv-close-file', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        if (!filename) return resolve();

        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        cleaner.close();
        const ok = filesMap.delete(filename);
        if (!ok) {
            return reject(`Failed to close file: ${filename}`);
        }

        resolve();
    });
});

/**
 * Handles the csv-get-buffer request. Pulls the buffer from filename's cleaner
 *
 * @returns an array of rows, or null if the entire file has been read
 */
ipcMain.handle('csv-get-buffer', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        try {
            // If no data has been loaded yet, load some for preview
            if (cleaner.buf.length === 0 && !cleaner.status.done && !cleaner.status.reading) {
                await cleaner.loadRows(Math.min(50, cleaner.buf_len)); // Load max 50 rows for preview
            }
            
            const buf = await cleaner.getBuffer();
            return resolve(buf);
        } catch (error) {
            return reject(`Failed to get buffer for file: ${filename}. Error: ${error.message}`);
        }
    });
});

/**
 * Handles the csv-clean-data request. Initiates the data cleaning process for a file
 *
 * @param filename - The name of the file to clean
 * @returns Promise that resolves when cleaning is initiated (not completed)
 */
ipcMain.handle('csv-clean-data', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        try {
            // Start the cleaning process in the background (don't await)
            cleaner.startCleaning()
                .catch((error) => {
                    console.error('Background cleaning error:', error);
                });
            
            // Return immediately so frontend can monitor progress
            resolve({ success: true, message: 'Data cleaning initiated' });
        } catch (error) {
            reject(`Failed to start cleaning for file: ${filename}. Error: ${error.message}`);
        }
    });
});

/**
 * Handles the csv-get-stats request. Gets current cleaning statistics for a file
 *
 * @param filename - The name of the file to get stats for
 * @returns Object containing cleaning statistics and performance metrics
 */
ipcMain.handle('csv-get-stats', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        if (!cleaner.isActive()) {
            return reject(`File: ${filename} is no longer active`);
        }

        try {
            const stats = cleaner.getStats();
            const performance = cleaner.getPerformance();
            resolve({ 
                stats, 
                performance,
                status: cleaner.status 
            });
        } catch (error) {
            reject(`Failed to get stats for file: ${filename}. Error: ${error.message}`);
        }
    });
});

/**
 * Handles the csv-get-progress request. Gets current cleaning progress for a file
 *
 * @param filename - The name of the file to get progress for
 * @returns Object containing progress information
 */
ipcMain.handle('csv-get-progress', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        if (!cleaner.isActive()) {
            return reject(`File: ${filename} is no longer active`);
        }

        try {
            const progress = cleaner.getProgress();
            resolve(progress);
        } catch (error) {
            reject(`Failed to get progress for file: ${filename}. Error: ${error.message}`);
        }
    });
});

/**
 * Handles the notify request. Creates an OS notification with the given message
 */
ipcMain.on('notify', (_, message) => {
    new Notification({ title: 'EyeDHD', body: message }).show();
});

/**
 * Handles the database requests
 */
ipcMain.handle('db-select-all', async () => {
    const db = getDb();
    const rows = await db.prepare(`SELECT * FROM ${TABLE} LIMIT 100;`).all();

    return rows;
});

// handlers.js (only the import handler shown)
ipcMain.handle('db-import-csv', async () => {
  const db = getDb();

  const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (canceled) {
      return null;
  }

  const filepath = filePaths[0];
  const filename = path.basename(filepath);

  const csvText = fs.readFileSync(filepath, 'utf8');

  // 1) Parse leniently
  const rowsRaw = parse(csvText, {
    bom: true,
    columns: true,           // objects keyed by header
    skip_empty_lines: true,  // ignore truly empty lines
    relax_column_count: true,// tolerate shorter/longer rows
    relax_quotes: true,
    trim: true
  });

  if (!rowsRaw.length) return null;

  // 2) Prepare header list from the file
  const columns = Object.keys(rowsRaw[0]);

  // 3) Normalize rows
  let skippedEmpty = 0;
  const rows = [];
  for (const rec of rowsRaw) {
    // Fill missing keys with null
    for (const c of columns) if (!(c in rec)) rec[c] = null;

    // Convert "" to null for all fields
    for (const c of columns) if (rec[c] === '') rec[c] = null;

    // If ALL fields are null/empty -> skip the row
    const allEmpty = columns.every(c => rec[c] == null);
    if (allEmpty) { skippedEmpty++; continue; }

    rows.push(rec);
  }

    if (!rows.length) return null;

    // 4) Dynamic INSERT that matches headers (safe for spaces)
    const cols = Object.keys(rows[0]);
    const colList = cols.map(c => `"${c.replace(/"/g, '""')}"`).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO "${TABLE}" (${colList}) VALUES (${placeholders})`;

    const insert = db.prepare(sql);

  // 5) Insert in a transaction
  let inserted = 0, skippedMalformed = 0;
  const insertMany = db.transaction((batch) => {
    for (const r of batch) {
      try {
        insert.run(r);
        inserted++;
      } catch {
        skippedMalformed++; // e.g., NOT NULL constraint, type constraint, etc.
      }
    }
  });
  insertMany(rows);

  return filename;
});

