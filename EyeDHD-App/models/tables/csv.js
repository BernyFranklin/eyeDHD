import path from 'path';

export default createCsvTable;

export function toTableName(filename) {
    return `${path.parse(filename).name}_csv`;
}

// Creates a new table for storing cleaned CSV data
function createCsvTable(db, filename) {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS ${toTableName(filename)} (
            Frame INTEGER PRIMARY KEY NOT NULL,
            CaptureTime INTEGER NOT NULL,
            LogTime INTEGER NOT NULL,
            HMDPositionX REAL NOT NULL,
            HMDPositionY REAL NOT NULL,
            HMDPositionz REAL NOT NULL,
            HMDRotationX REAL NOT NULL,
            HMDRotationY REAL NOT NULL,
            HMDRotationZ REAL NOT NULL,
            HMDRotationHuh REAL NOT NULL,
            GazeStatus TEXT NOT NULL,
            CombinedGazeForwardX REAL NOT NULL,
            CombinedGazeForwardY REAL NOT NULL,
            CombinedGazeForwardZ REAL NOT NULL,
            CombinedGazePositionX REAL NOT NULL,
            CombinedGazePositionY REAL NOT NULL,
            CombinedGazePositionZ REAL NOT NULL,
            InterPupillaryDistanceInMM REAL NOT NULL,
            LeftEyeStatus TEXT NOT NULL,
            LeftEyeForwardX REAL NOT NULL,
            LeftEyeForwardY REAL NOT NULL,
            LeftEyeForwardZ REAL NOT NULL,
            LeftEyePositionX REAL NOT NULL,
            LeftEyePositionY REAL NOT NULL,
            LeftEyePositionZ REAL NOT NULL,
            LeftPupilIrisDiameterRatio REAL NOT NULL,
            LeftPupilDiameterInMM REAL NOT NULL,
            LeftIrisDiameterInMM REAL NOT NULL,
            left Eye Openness REAL NOT NULL,
            RightEyeStatus TEXT NOT NULL,
            RightEyeForwardX REAL NOT NULL,
            RightEyeForwardY REAL NOT NULL,
            RightEyeForwardZ REAL NOT NULL,
            RightEyePositionX REAL NOT NULL,
            RightEyePositionY REAL NOT NULL,
            RightEyePositionZ REAL NOT NULL,
            RightPupilIrisDiameterRatio REAL NOT NULL,
            RightPupilDiameterInMM REAL NOT NULL,
            RightIrisDiameterInMM REAL NOT NULL,
            Right Eye Openness REAL NOT NULL,
            FocusDistance REAL NOT NULL,
            FocusStability REAL NOT NULL
        );
    `).run();
}