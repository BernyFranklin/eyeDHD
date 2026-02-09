export default class DataStream<T> {
  buf: T[];
  type: string;

  filename: string;
  totalRows: number;
  status: {
    initialized: boolean;
    running: boolean;
    completed: boolean;
  };

  constructor(type: string, filename: string, totalRows: number) {
    this.buf = [];
    this.type = type;

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
