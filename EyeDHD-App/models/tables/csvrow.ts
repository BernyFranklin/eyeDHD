import type { Database } from 'better-sqlite3';

// Converts filename into table name
// ID.011.csv -> ID_011_csv_rows
export function toTableName(filename: string) {
  // Replace '.' with '_' in filename
  const name = filename.replace(/\./g, '_');
  return `${name}_rows`;
}

export class CSVData {
  Frame: number;
  CaptureTime: number;
  LogTime: number;
  HMDPositionX: number;
  HMDPositionY: number;
  HMDPositionz: number;
  HMDRotationX: number;
  HMDRotationY: number;
  HMDRotationZ: number;
  HMDRotationHuh: number;
  GazeStatus: string;
  CombinedGazeForwardX: number;
  CombinedGazeForwardY: number;
  CombinedGazeForwardZ: number;
  CombinedGazePositionX: number;
  CombinedGazePositionY: number;
  CombinedGazePositionZ: number;
  InterPupillaryDistanceInMM: number;
  LeftEyeStatus: string;
  LeftEyeForwardX: number;
  LeftEyeForwardY: number;
  LeftEyeForwardZ: number;
  LeftEyePositionX: number;
  LeftEyePositionY: number;
  LeftEyePositionZ: number;
  LeftPupilIrisDiameterRatio: number;
  LeftPupilDiameterInMM: number;
  LeftIrisDiameterInMM: number;
  LeftEyeOpenness: number;
  RightEyeStatus: string;
  RightEyeForwardX: number;
  RightEyeForwardY: number;
  RightEyeForwardZ: number;
  RightEyePositionX: number;
  RightEyePositionY: number;
  RightEyePositionZ: number;
  RightPupilIrisDiameterRatio: number;
  RightPupilDiameterInMM: number;
  RightIrisDiameterInMM: number;
  RightEyeOpenness: number;
  FocusDistance: number;
  FocusStability: number;

  constructor() {
    this.Frame = 0;
    this.CaptureTime = 0;
    this.LogTime = 0;
    this.HMDPositionX = 0;
    this.HMDPositionY = 0;
    this.HMDPositionz = 0;
    this.HMDRotationX = 0;
    this.HMDRotationY = 0;
    this.HMDRotationZ = 0;
    this.HMDRotationHuh = 0;
    this.GazeStatus = 'INVALID';
    this.CombinedGazeForwardX = 0;
    this.CombinedGazeForwardY = 0;
    this.CombinedGazeForwardZ = 0;
    this.CombinedGazePositionX = 0;
    this.CombinedGazePositionY = 0;
    this.CombinedGazePositionZ = 0;
    this.InterPupillaryDistanceInMM = 0;
    this.LeftEyeStatus = 'INVALID';
    this.LeftEyeForwardX = 0;
    this.LeftEyeForwardY = 0;
    this.LeftEyeForwardZ = 0;
    this.LeftEyePositionX = 0;
    this.LeftEyePositionY = 0;
    this.LeftEyePositionZ = 0;
    this.LeftPupilIrisDiameterRatio = 0;
    this.LeftPupilDiameterInMM = 0;
    this.LeftIrisDiameterInMM = 0;
    this.LeftEyeOpenness = 0;
    this.RightEyeStatus = 'INVALID';
    this.RightEyeForwardX = 0;
    this.RightEyeForwardY = 0;
    this.RightEyeForwardZ = 0;
    this.RightEyePositionX = 0;
    this.RightEyePositionY = 0;
    this.RightEyePositionZ = 0;
    this.RightPupilIrisDiameterRatio = 0;
    this.RightPupilDiameterInMM = 0;
    this.RightIrisDiameterInMM = 0;
    this.RightEyeOpenness = 0;
    this.FocusDistance = 0;
    this.FocusStability = 0;
  }
}

export function deleteRowTable(db: Database, filename: string) {
  db.prepare(
    `
    DROP TABLE IF EXISTS ${toTableName(filename)};
  `
  ).run();
}

// Creates a new table for storing cleaned CSV data
export function createRowTable(db: Database, filename: string) {
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS ${toTableName(filename)} (
      Frame INTEGER PRIMARY KEY NOT NULL,
      CaptureTime INTEGER DEFAULT 0,
      LogTime INTEGER DEFAULT 0,
      HMDPositionX REAL DEFAULT 0,
      HMDPositionY REAL DEFAULT 0,
      HMDPositionz REAL DEFAULT 0,
      HMDRotationX REAL DEFAULT 0,
      HMDRotationY REAL DEFAULT 0,
      HMDRotationZ REAL DEFAULT 0,
      HMDRotationHuh REAL DEFAULT 0,
      GazeStatus TEXT DEFAULT 'INVALID',
      CombinedGazeForwardX REAL DEFAULT 0,
      CombinedGazeForwardY REAL DEFAULT 0,
      CombinedGazeForwardZ REAL DEFAULT 0,
      CombinedGazePositionX REAL DEFAULT 0,
      CombinedGazePositionY REAL DEFAULT 0,
      CombinedGazePositionZ REAL DEFAULT 0,
      InterPupillaryDistanceInMM REAL DEFAULT 0,
      LeftEyeStatus TEXT DEFAULT 'INVALID',
      LeftEyeForwardX REAL DEFAULT 0,
      LeftEyeForwardY REAL DEFAULT 0,
      LeftEyeForwardZ REAL DEFAULT 0,
      LeftEyePositionX REAL DEFAULT 0,
      LeftEyePositionY REAL DEFAULT 0,
      LeftEyePositionZ REAL DEFAULT 0,
      LeftPupilIrisDiameterRatio REAL DEFAULT 0,
      LeftPupilDiameterInMM REAL DEFAULT 0,
      LeftIrisDiameterInMM REAL DEFAULT 0,
      LeftEyeOpenness REAL DEFAULT 0,
      RightEyeStatus TEXT DEFAULT 'INVALID',
      RightEyeForwardX REAL DEFAULT 0,
      RightEyeForwardY REAL DEFAULT 0,
      RightEyeForwardZ REAL DEFAULT 0,
      RightEyePositionX REAL DEFAULT 0,
      RightEyePositionY REAL DEFAULT 0,
      RightEyePositionZ REAL DEFAULT 0,
      RightPupilIrisDiameterRatio REAL DEFAULT 0,
      RightPupilDiameterInMM REAL DEFAULT 0,
      RightIrisDiameterInMM REAL DEFAULT 0,
      RightEyeOpenness REAL DEFAULT 0,
      FocusDistance REAL DEFAULT 0,
      FocusStability REAL DEFAULT 0
    );
  `
  ).run();
}
