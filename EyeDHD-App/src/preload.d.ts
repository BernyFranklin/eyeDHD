declare global {
  interface Window {
    electron: {
      csv: {
        openFile(request_size?: number): Promise<string | null>;

        resetReadingProgress(filename: string): Promise<any>;
        resetCleaningProgress(filename: string): Promise<any>;
        getMetadata(filename: string): Promise<any>;
        getFileList(): Promise<string[]>;
        getBuffer(filename: string): Promise<any[] | null>;
        getFirstAndLast(filename: string): Promise<{ first: any; last: any } | null>;
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

      notify(message: string): void;
    };
  }
}
