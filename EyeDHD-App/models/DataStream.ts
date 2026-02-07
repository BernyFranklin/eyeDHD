import type { CSVData } from './tables/csvrow';

export default class DataStream<T> {
  buf: T[];

  filename: string;
  totalRows: number;
  status: {
    initialized: boolean;
    running: boolean;
    completed: boolean;
  };

  constructor(filename: string, totalRows: number) {
    this.buf = [];

    this.filename = filename;
    this.totalRows = totalRows;
    this.status = {
      initialized: false,
      running: false,
      completed: false
    };
  }

  init() {}
}
