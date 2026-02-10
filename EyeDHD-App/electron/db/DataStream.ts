import { type Metadata } from "./tables/metadata";

type Datatype = "Metadata" | "CSVData" | "SaccadeData" | "Progress";

export default class DataStream<T> {
  private buf: T[];
  type: Datatype;

  file: Metadata;
  totalRows: number;
  status: {
    initialized: boolean;
    running: boolean;
    completed: boolean;
  };

  constructor(type: Datatype, file: Metadata, total: number) {
    this.buf = [];
    this.type = type;

    this.file = file;
    this.totalRows = total;
    this.status = {
      initialized: false,
      running: false,
      completed: false
    };

    this.status.initialized = true;
  }
}
