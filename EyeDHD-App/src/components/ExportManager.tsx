import React, { useState, useRef } from 'react';
import FrameExporter from './animation/FrameExporter';
import Button from './Button';

import { type CSVData } from '../../electron/data/tables/csv';

type Options = {
  csvData: CSVData[] | null;
  fileName: string;
  onExportComplete: any;
};

/**
 * ExportManager - Handles the animation export process using MediaRecorder
 */
export default function ExportManager({ csvData, fileName, onExportComplete }: Options) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [fullCsvData, setFullCsvData] = useState<CSVData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const exportStartTimeRef = useRef<number>(null);

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flex: 1,
      alignItems: 'stretch'
    },
    title: {
      fontSize: '1.2rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      color: '#333'
    },
    progressContainer: {
      width: '100%',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden',
      height: '20px',
      marginBottom: '0.5rem'
    },
    progressBar: {
      height: '100%',
      backgroundColor: '#4CAF50',
      transition: 'width 0.3s ease',
      width: `${exportProgress}%`
    },
    status: {
      fontSize: '0.9rem',
      color: '#666',
      marginBottom: '0.5rem'
    },
    stats: {
      fontSize: '0.8rem',
      color: '#888'
    },
    buttonRow: {
      display: 'flex',
      gap: '1rem',
      marginTop: '1rem'
    },
    infoBox: {
      backgroundColor: '#e3f2fd',
      border: '1px solid #2196f3',
      borderRadius: '4px',
      padding: '1rem',
      marginBottom: '1rem',
      fontSize: '0.9rem',
      color: '#0d47a1',
      maxWidth: '80%',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      whiteSpace: 'normal'
    }
  };

  const loadFullDataset = async () => {
    setIsLoadingData(true);
    setExportStatus('Loading complete dataset...');

    try {
      // Reset reading progress to start from beginning
      await window.electron.csv.resetReadingProgress(fileName);

      let allData: CSVData[] = [];
      let batch;
      let batchCount = 0;

      do {
        // Load data in larger chunks for export
        batch = await window.electron.csv.getBuffer(fileName);
        if (batch && batch.length > 0) {
          allData = [...allData, ...batch];
          batchCount++;
          setExportStatus(
            `Loading dataset... ${allData.length.toLocaleString()} rows loaded`
          );
        }
      } while (batch && batch.length > 0);

      console.log(`Loaded complete dataset: ${allData.length} total rows`);
      setFullCsvData(allData);
      setIsLoadingData(false);
      return allData;
    } catch (error: any) {
      console.error('Failed to load complete dataset:', error);
      setExportStatus(`Failed to load data: ${error.message}`);
      setIsLoadingData(false);
      return null;
    }
  };

  const startExport = async () => {
    if (!csvData || csvData.length === 0) {
      setExportStatus('No data available for export');
      return;
    }

    // Log start time
    exportStartTimeRef.current = Date.now();
    console.log('🎬 Export Video clicked at:', new Date().toLocaleTimeString());

    // Load the complete dataset first
    const completeData = await loadFullDataset();
    if (!completeData) {
      setExportStatus('Failed to load complete dataset');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setCurrentFrame(0);
    setTotalFrames(completeData.length);
    setExportStatus('Starting export...');
  };

  const cancelExport = () => {
    const endTime = Date.now();
    const totalDuration = exportStartTimeRef.current
      ? (endTime - exportStartTimeRef.current) / 1000
      : 0;

    setIsExporting(false);
    setIsLoadingData(false);
    setExportProgress(0);
    setExportStatus('Export cancelled');
    setCurrentFrame(0);
    setTotalFrames(0);
    setFullCsvData([]);

    // Log cancellation
    console.log('🚫 Video export cancelled at:', new Date().toLocaleTimeString());
    console.log(
      `⏱️  Time elapsed before cancellation: ${Math.floor(totalDuration / 60)}m ${Math.round(totalDuration % 60)}s`
    );

    exportStartTimeRef.current = null;
  };

  const handleProgress = (progress: any, frame: any, total: any) => {
    setExportProgress(progress);
    setCurrentFrame(frame);
    setTotalFrames(total);
    setExportStatus(
      `Recording animation: Frame ${frame.toLocaleString()} of ${total.toLocaleString()} (${Math.round(progress)}%)`
    );
  };

  const handleExportComplete = (result: any) => {
    const endTime = Date.now();
    const totalDuration = exportStartTimeRef.current
      ? (endTime - exportStartTimeRef.current) / 1000
      : 0;

    setIsExporting(false);

    if (result.success) {
      setExportProgress(100);
      setExportStatus(`Export completed! Video saved to: ${result.outputPath}`);

      // Log completion time with duration
      console.log('✅ Video export completed at:', new Date().toLocaleTimeString());
      console.log(
        `⏱️  Total export time: ${Math.floor(totalDuration / 60)}m ${Math.round(totalDuration % 60)}s`
      );
      console.log(
        `📊 Processed ${result.frameCount?.toLocaleString() || 'Unknown'} frames`
      );

      if (onExportComplete) {
        onExportComplete(result);
      }
    } else {
      setExportProgress(0);
      setExportStatus(`Export failed: ${result.error || 'Unknown error'}`);

      // Log failure time
      console.log('❌ Video export failed at:', new Date().toLocaleTimeString());
      console.log(
        `⏱️  Time elapsed before failure: ${Math.floor(totalDuration / 60)}m ${Math.round(totalDuration % 60)}s`
      );
    }

    // Clear full dataset to free memory
    setFullCsvData([]);
    exportStartTimeRef.current = null;
  };

  return (
    <>
      <h3 style={styles.title}>Export Animation</h3>

      <div style={styles.infoBox as any}>
        <strong>Real-time Video Recording</strong>
        <br />
        This export method records the animation in real-time as an MP4 video (or WebM if
        MP4 isn't supported). The export will take approximately the same time as the
        animation duration. For example, 20 minutes of data, will take approximately 20
        minutes to export.
        <br />
        <br />
        Ensure that the application remains open and active during the export process.
      </div>

      {isLoadingData && (
        <div>
          <div style={styles.progressContainer}>
            <div style={{ ...styles.progressBar, width: '50%' }}></div>
          </div>
          <div style={styles.status}>Loading complete dataset...</div>
        </div>
      )}

      {isExporting && !isLoadingData && (
        <div>
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}></div>
          </div>
          <div style={styles.status}>{exportStatus}</div>
          <div style={styles.stats}>
            Frames processed: {currentFrame.toLocaleString()} /{' '}
            {totalFrames.toLocaleString()}
          </div>
        </div>
      )}

      <div style={styles.buttonRow}>
        <Button
          onClick={startExport}
          disabled={isExporting || isLoadingData || !csvData || csvData.length === 0}
          className="btn"
          buttonText={
            isLoadingData
              ? 'Loading Data...'
              : isExporting
                ? 'Recording...'
                : `Export Video`
          }
        />

        {(isExporting || isLoadingData) && (
          <Button onClick={cancelExport} className="btn" buttonText="Cancel Export" />
        )}
      </div>

      {/* Hidden frame exporter component that uses MediaRecorder */}
      {isExporting && fullCsvData && (
        <FrameExporter
          csvData={fullCsvData}
          fileName={fileName}
          onProgress={handleProgress}
          onExportComplete={handleExportComplete}
          isExporting={isExporting}
        />
      )}
    </>
  );
}
