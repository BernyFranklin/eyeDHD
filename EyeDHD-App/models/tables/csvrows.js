export default createRowsTable;

// Converts filename into table name
// ID.011.csv -> ID_011_csv_rows
export function toTableName(filename) {
  // Replace '.' with '_' in filename
  const name = filename.replace(/\./g, '_');
  return `${name}_rows`;
}

// Creates a new table for storing cleaned CSV data
function createRowsTable(db, filename) {
  db.prepare(`
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
  `).run();
}
