import { app, dialog, ipcMain, Notification } from 'electron';
import path from 'path';
import os from 'os';

import { filesMap } from './store.js';
import getDB from '../models/dbmgr.js';
import createMetadataTable from '../models/tables/metadata.js';
import createRowsTable from '../models/tables/csvrows.js';
import metadataActions from '../models/actions/metadata.js';
import csvrows from '../models/actions/csvrows.js';
import DataCleaner from './stuff/DataCleaner.js';

/*
 * Database setup
 * Set testing to true to use a temporary db instead of a file
 */
const appRoot = app.getAppPath();
const db = getDB({
  path: path.join(appRoot, 'main.db'),
  testing: false
});
createMetadataTable(db);

/**
 * Handles the csv-open-file request. Opens a file selector
 *
 * @returns filename if a file is selected, or null if none is selected
 */
ipcMain.handle('csv-open-file', async (_, buffer_size) => {
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
    let metadata = metadataActions.read(db, filename);
    if (metadata) {
      if (!filesMap.get(metadata.name)) {
        filesMap.set(
          metadata.name,
          new DataCleaner({
            db,
            name: metadata.name,
            path: metadata.path,
            buf_len: metadata.buffer_size
          })
        );
      }
      return resolve(filename);
    }

    metadata = metadataActions.create(db, filename, filepath, buffer_size);
    if (!metadata) {
      return reject(`Failed to create metadata for file: ${filename}`);
    }

    createRowsTable(db, metadata.name);

    const cleaner = new DataCleaner({
      db,
      name: metadata.name,
      path: metadata.path,
      buf_len: metadata.buffer_size
    });

    filesMap.set(metadata.name, cleaner);

    return resolve(filename);
  });
});

function cleanFile(original) {
  return new Promise(async (resolve, reject) => {
    let metadata = original;

    // fetch cleaner
    const cleaner = filesMap.get(metadata.name);
    if (!cleaner) {
      return reject(`No cleaner found for metadata: ${metadata.name}`);
    }

    // Load first batch of rows then loop until file has been cleaned
    let buffer = await cleaner.getBuffer();

    if (cleaner.status.done) {
      return resolve();
    }

    // Only set the first frame number when cleaning is not in progress
    if (!cleaner.status.start) {
      const ok = metadataActions.update(db, {
        ...metadata,
        first_frame: buffer[0].Frame
      });
      if (!ok) {
        return reject(`Failed to update metadata for file: ${metadata.name}`);
      }

      cleaner.start();
    }

    // Process in chunks to avoid blocking the main thread
    const processChunk = async () => {
      let processedInChunk = 0;
      const chunkSize = 10; // Process 10 buffers per chunk
      
      while (buffer && processedInChunk < chunkSize) {
        // Store rows
        let stored = csvrows.create(db, metadata, buffer);
        if (!stored) {
          return reject(`Failed to store rows for file: ${metadata.name}`);
        }

        // Update file metadata
        const updated = metadataActions.update(db, {
          ...metadata,
          last_frame: buffer[buffer.length - 1].Frame,
          cleaned: (metadata.cleaned += buffer.length)
        });
        if (!updated) {
          return reject(`Failed to update metadata for file: ${metadata.name}`);
        }

        buffer = await cleaner.getBuffer();
        metadata = metadataActions.read(db, metadata.name);
        processedInChunk++;
      }
      
      if (buffer) {
        // Yield control back to the event loop
        setImmediate(processChunk);
      } else {
        // Cleaning complete
        const updated = metadataActions.update(db, { ...metadata, completed: 1 });
        if (!updated) {
          return reject(`Failed to update metadata for file: ${metadata.name}`);
        }

        cleaner.close();
        resolve();
      }
    };

    // Start processing
    processChunk().catch(reject);
  });
}

ipcMain.handle('csv-get-metadata', async (_, filename) => {
  return new Promise(async (resolve, reject) => {
    const metadata = metadataActions.read(db, filename);
    if (!metadata) {
      return reject(`File: ${filename} has not been opened`);
    }

    return resolve(metadata);
  });
});

ipcMain.handle('csv-get-file-list', async (_) => {
  return new Promise(async (resolve) => {
    const files = metadataActions.readAll(db);

    if (!files) {
      return resolve(null);
    }

    return resolve(
      files
        .filter((metadata) => metadata.completed)
        .map((metadata) => metadata.name)
    );
  });
});

ipcMain.handle('csv-reset-reading-progress', async (_, filename) => {
  return new Promise(async (resolve, reject) => {
    const metadata = metadataActions.read(db, filename);
    if (!metadata) {
      return reject(`File: ${filename} has not been opened`);
    }

    const updated = metadataActions.update(db, { ...metadata, requested: 0 });
    if (!updated) {
      return reject(`Failed to reset reading progress for: ${filename}`);
    }

    return resolve();
  });
});

ipcMain.handle('csv-reset-cleaning-progress', async (_, filename) => {
  return new Promise(async (resolve, reject) => {
    const metadata = metadataActions.read(db, filename);
    if (!metadata) {
      return reject(`File: ${filename} has not been opened`);
    }

    const updated = metadataActions.update(db, {
      ...metadata,
      requested: 0,
      cleaned: 0,
      completed: 0
    });
    if (!updated) {
      return reject(`Failed to reset cleaning progress for: ${filename}`);
    }

    const cleaner = filesMap.get(metadata.name);
    if (!cleaner) return resolve();

    cleaner.close();
    filesMap.delete(metadata.name);
    filesMap.set(
      metadata.name,
      new DataCleaner({
        db,
        name: metadata.name,
        path: metadata.path,
        buf_len: metadata.buffer_size
      })
    );

    return resolve();
  });
});

/**
 * Handles the csv-get-buffer request. Pulls the buffer from filename's cleaner
 *
 * @returns an array of rows, or null if the entire file has been read
 */
ipcMain.handle('csv-get-buffer', async (_, filename) => {
  const handlerStart = performance.now();
  console.log(`📦 [PERF-IPC] csv-get-buffer called for: ${filename}`);
  
  return new Promise(async (resolve, reject) => {
    const metadataStart = performance.now();
    const metadata = metadataActions.read(db, filename);
    const metadataTime = performance.now() - metadataStart;
    
    if (!metadata) {
      console.log(`❌ [PERF-IPC] csv-get-buffer: Metadata not found for: ${filename}`);
      return reject(`File: ${filename} has not been opened`);
    }
    
    const rowsStart = performance.now();
    const rows = await csvrows.read(db, metadata);
    const rowsTime = performance.now() - rowsStart;
    
    if (rows === undefined) {
      const errorTime = performance.now() - handlerStart;
      console.error(`❌ [PERF-IPC] csv-get-buffer: Failed to read rows`, {
        file: filename,
        time: `${errorTime.toFixed(2)}ms`
      });
      return reject(`Failed to read cleaned rows for file: ${filename}`);
    }

    const updateStart = performance.now();
    const updated = metadataActions.update(db, {
      ...metadata,
      requested: metadata.requested + rows.length
    });
    const updateTime = performance.now() - updateStart;
    const totalTime = performance.now() - handlerStart;
    
    if (!updated) {
      console.error(`❌ [PERF-IPC] csv-get-buffer: Failed to update metadata`, {
        file: filename,
        time: `${totalTime.toFixed(2)}ms`
      });
      return reject(`Failed to update requested count for file: ${filename}`);
    }

    console.log(`📦 [PERF-IPC] csv-get-buffer completed`, {
      file: filename,
      metadataTime: `${metadataTime.toFixed(2)}ms`,
      rowsTime: `${rowsTime.toFixed(2)}ms`,
      updateTime: `${updateTime.toFixed(2)}ms`,
      totalTime: `${totalTime.toFixed(2)}ms`,
      rowCount: rows.length
    });

    return resolve(rows);
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
    try {
      const metadata = metadataActions.read(db, filename);
      if (!metadata) {
        return reject(`File: ${filename} has not been opened`);
      }

      // Start cleaning in background without blocking
      cleanFile(metadata).catch(error => {
        console.error(`Background cleaning failed for ${filename}:`, error);
      });

      resolve({ success: true, message: 'Data cleaning initiated' });
    } catch (error) {
      reject(
        `Failed to start cleaning for file: ${filename}. Error: ${error.message}`
      );
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
      // File finished cleaning
      console.log(`File: ${filename} cleaning completed`);
    }

    try {
      const stats = cleaner.getStats();
      const performanceData = cleaner.getPerformance();
      
      resolve({
        stats,
        performance: performanceData,
        status: cleaner.status
      });
    } catch (error) {
      reject(
        `Failed to get stats for file: ${filename}. Error: ${error.message}`
      );
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
      // File finished cleaning
      console.log(`File: ${filename} cleaning completed`);
    }

    try {
      const progress = cleaner.getProgress();
      resolve(progress);
    } catch (error) {
      reject(
        `Failed to get progress for file: ${filename}. Error: ${error.message}`
      );
    }
  });
});

/**
 * Handles the csv-export-data request. Exports cleaned CSV data to a new file
 */
ipcMain.handle('csv-export-data', async (_, filename) => {
  return new Promise(async (resolve, reject) => {
    const cleaner = filesMap.get(filename);

    if (!cleaner) {
      return reject(`File: ${filename} has not been opened`);
    }

    if (cleaner.isActive()) {
      return reject(
        `File: ${filename} hasn't been cleaned yet. Clean the file first.`
      );
    }

    try {
      // Show save dialog
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Cleaned CSV',
        defaultPath: path.join(
          os.homedir(),
          `${path.parse(filename).name}_cleaned.csv`
        ),
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
      });

      if (canceled || !filePath) {
        return resolve({ success: false, message: 'Export canceled' });
      }

      // Export the cleaned data
      const result = await cleaner.exportToCSV(filePath);
      resolve(result);
    } catch (error) {
      reject(`Failed to export file: ${filename}. Error: ${error.message}`);
    }
  });
});

ipcMain.handle('csv-get-first-and-last', async (_, filename) => {
  return new Promise(async (resolve, reject) => {
    const metadata = metadataActions.read(db, filename);
    if (!metadata) {
      return reject(`File: ${filename} has not been opened`);
    }

    const result = csvrows.firstAndLast(db, metadata);
    if (!result) {
      return reject(`Failed to read cleaned rows for file: ${filename}`);
    }

    return resolve(result);
  });
});

/**
 * Handles the notify request. Creates an OS notification with the given message
 */
ipcMain.on('notify', (_, message) => {
  new Notification({ title: 'EyeDHD', body: message }).show();
});
