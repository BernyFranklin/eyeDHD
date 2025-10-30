

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

        const cleaner = new DataCleaner({
            path: filepath,
            buf_len: bufferSize
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
 * Handles the csv-get-row request. Reads a row from filename's cleaner
 *
 * @returns a cleaned row, or null if the entire file has been read
 */
ipcMain.handle('csv-get-row', async (_, filename) => {
    return new Promise(async (resolve, reject) => {
        const cleaner = filesMap.get(filename);
        if (!cleaner) {
            return reject(`File: ${filename} has not been opened`);
        }

        const row = await cleaner.getRow();
        return resolve(row);
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

        const buf = await cleaner.getBuffer();
        return resolve(buf);
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
      return resolve(null);
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

    if (!rows.length) return { inserted: 0, skippedEmpty, skippedMalformed: 0 };

    // 4) Dynamic INSERT that matches headers (safe for spaces)
    const cols = Object.keys(rows[0]);
    console.log('[DB import] Table:', TABLE);
    console.log('[DB import] Columns from CSV:', cols);
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

