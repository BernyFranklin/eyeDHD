import { type DataType, type StreamType, type StreamKey } from '../electron/db/DatabaseManager';
import { type CSVData } from '../electron/db/tables/csv';
import { type Metadata } from '../electron/db/tables/metadata';
import { type SaccadeData } from '../electron/db/tables/saccade';
import { type Progress } from '../electron/db/tables/progress';

export {};

declare interface Electron {
  csv: {
    openFile(): Promise<string | null>;

    resetReadingProgress(filename: string): Promise<void>;
    resetCleaningProgress(filename: string): Promise<void>;
    getMetadata(filename: string): Promise<Metadata>;
    getFileList(): Promise<Metadata[]>;
    getBuffer(filename: string): Promise<CSVData[] | null>;
    getFirstAndLast(filename: string): Promise<{ first: CSVData; last: CSVData } | null>;
    cleanData(filename: string): Promise<any>;
    getStats(filename: string): Promise<Record<string, any>>;
    getProgress(filename: string): Promise<Record<string, any>>;
    exportData(filename: string): Promise<any>;
    saveFile(options: any): Promise<any>;
  };

  video: {
    selectFile(): Promise<string | null>;
    SidebySide(vrFile: string, animFile: string, offsetSeconds: number): Promise<any>;
    toVideoURL(filePath: string | null): string | null;
  };

  animation: {
    exportInit(options: any): Promise<any>;
    exportAddFrame(sessionId: string, frameData: any): Promise<any>;
    exportFinalize(sessionId: string): Promise<any>;
    exportProgress(sessionId: string): Promise<any>;
    exportCancel(sessionId: string): Promise<any>;
  };

  stream: {
  	start(type: StreamType, file?: Metadata): Promise<StreamKey>;
   	pull(key: StreamKey, count: number): Promise<{ done: boolean }>;
   	cancel(key: StreamKey): void;
  }

  notify(message: string): void;
}

declare global {
  interface Window {
    electron: Electron;
  }
}
