import { toTableName } from '../tables/csvrows.js';

export default { create, read, firstAndLast };

function create(db, file, rows) {
  try {
    const table = toTableName(file.name);
    const insert = db.prepare(`
    	INSERT INTO ${table} (
        Frame,
        CaptureTime,
        LogTime,
        HMDPositionX,
        HMDPositionY,
        HMDPositionz,
        HMDRotationX,
        HMDRotationY,
        HMDRotationZ,
        HMDRotationHuh,
        GazeStatus,
        CombinedGazeForwardX,
        CombinedGazeForwardY,
        CombinedGazeForwardZ,
        CombinedGazePositionX,
        CombinedGazePositionY,
        CombinedGazePositionZ,
        InterPupillaryDistanceInMM,
        LeftEyeStatus,
        LeftEyeForwardX,
        LeftEyeForwardY,
        LeftEyeForwardZ,
        LeftEyePositionX,
        LeftEyePositionY,
        LeftEyePositionZ,
        LeftPupilIrisDiameterRatio,
        LeftPupilDiameterInMM,
        LeftIrisDiameterInMM,
        LeftEyeOpenness,
        RightEyeStatus,
        RightEyeForwardX,
        RightEyeForwardY,
        RightEyeForwardZ,
        RightEyePositionX,
        RightEyePositionY,
        RightEyePositionZ,
        RightPupilIrisDiameterRatio,
        RightPupilDiameterInMM,
        RightIrisDiameterInMM,
        RightEyeOpenness,
        FocusDistance,
        FocusStability
    	)
    	VALUES (
        @Frame,
        @CaptureTime,
        @LogTime,
        @HMDPositionX,
        @HMDPositionY,
        @HMDPositionz,
        @HMDRotationX,
        @HMDRotationY,
        @HMDRotationZ,
        @HMDRotationHuh,
        @GazeStatus,
        @CombinedGazeForwardX,
        @CombinedGazeForwardY,
        @CombinedGazeForwardZ,
        @CombinedGazePositionX,
        @CombinedGazePositionY,
        @CombinedGazePositionZ,
        @InterPupillaryDistanceInMM,
        @LeftEyeStatus,
        @LeftEyeForwardX,
        @LeftEyeForwardY,
        @LeftEyeForwardZ,
        @LeftEyePositionX,
        @LeftEyePositionY,
        @LeftEyePositionZ,
        @LeftPupilIrisDiameterRatio,
        @LeftPupilDiameterInMM,
        @LeftIrisDiameterInMM,
        @LeftEyeOpenness,
        @RightEyeStatus,
        @RightEyeForwardX,
        @RightEyeForwardY,
        @RightEyeForwardZ,
        @RightEyePositionX,
        @RightEyePositionY,
        @RightEyePositionZ,
        @RightPupilIrisDiameterRatio,
        @RightPupilDiameterInMM,
        @RightIrisDiameterInMM,
        @RightEyeOpenness,
        @FocusDistance,
        @FocusStability
    	);
    `);

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        try {
          insert.run(row);
        } catch (err) {
          // If error is that the Frame primary key already exists continue
          if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            console.warn(
              `Frame ${row.Frame} already exists in table ${table}. Skipping insert.`
            );
            continue;
          } else {
            throw err;
          }
        }
      }
    });

    insertMany(rows);

    return true;
  } catch (err) {
    console.error(err);

    return false;
  }
}

function read(db, file) {
  console.log('Reading DB:', db.name, " and file name: ", file.name, " and file size", file.size);

  try {
    const table = toTableName(file.name);

    let rows = db
      .prepare(`
        SELECT * FROM ${table}
			  LIMIT ? OFFSET ?;
			`)
      .all(file.request_size, file.requested);

    return rows;
  } catch (err) {
    console.error(err);

    return undefined;
  }
}

function firstAndLast(db, file) {
  try {
    const table = toTableName(file.name);

    const first = db
      .prepare(`
        SELECT * FROM ${table}
        WHERE frame = ?;
      `)
      .get(file.first_frame);

    const last = db
      .prepare(`
        SELECT * FROM ${table}
			  WHERE frame = ?;
			`)
      .get(file.last_frame);

    return { first, last };
  } catch (err) {
    console.error(err);

    return null;
  }
}
