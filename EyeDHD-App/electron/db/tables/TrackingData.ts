export type TrackingData = {
	Frame: number; // Keep
	CaptureTime: number; // Keep
	LogTime: number; // Keep
	// HMDPositionX: number;
	// HMDPositionY: number;
	// HMDPositionz: number;
	// HMDRotationX: number;
	// HMDRotationY: number;
	// HMDRotationZ: number;
	// HMDRotationHuh: number;
	GazeStatus: string; // Keep
	CombinedGazeForwardX: number; // Keep
	CombinedGazeForwardY: number; // Keep
	CombinedGazeForwardZ: number; // Keep
	// CombinedGazePositionX: number;
	// CombinedGazePositionY: number;
	// CombinedGazePositionZ: number;
	// InterPupillaryDistanceInMM: number;
	LeftEyeStatus: string; // Keep
	LeftEyeForwardX: number; // Keep
	LeftEyeForwardY: number; // Keep
	LeftEyeForwardZ: number; // Keep
	// LeftEyePositionX: number;
	// LeftEyePositionY: number;
	// LeftEyePositionZ: number;
	// LeftPupilIrisDiameterRatio: number;
	LeftPupilDiameterInMM: number; // Keep
	// LeftIrisDiameterInMM: number;
	// LeftEyeOpenness: number;
	RightEyeStatus: string; // Keep
	RightEyeForwardX: number; // Keep
	RightEyeForwardY: number; // Keep
	RightEyeForwardZ: number; // Keep
	// RightEyePositionX: number;
	// RightEyePositionY: number;
	// RightEyePositionZ: number;
	// RightPupilIrisDiameterRatio: number;
	RightPupilDiameterInMM: number; // Keep
	// RightIrisDiameterInMM: number;
	// RightEyeOpenness: number;
	// FocusDistance: number;
	// FocusStability: number;
};

export const TRACKING_DATA_HEADERS = [
	'Frame',
	'CaptureTime',
	'LogTime',
	'GazeStatus',
	'CombinedGazeForwardX',
	'CombinedGazeForwardY',
	'CombinedGazeForwardZ',
	'LeftEyeStatus',
	'LeftEyeForwardX',
	'LeftEyeForwardY',
	'LeftEyeForwardZ',
	'LeftPupilDiameterInMM',
	'RightEyeStatus',
	'RightEyeForwardX',
	'RightEyeForwardY',
	'RightEyeForwardZ',
	'RightPupilDiameterInMM'
] as const;

export const fromCSV = (line: string): TrackingData => {
	const values = line.split(',');
	if (values.length !== 17) {
		throw new Error(`Invalid CSV line, expected 17 values but got ${values.length}`);
	}

	return {
		Frame: Number(values[0]),
		CaptureTime: Number(values[1]),
		LogTime: Number(values[2]),
		GazeStatus: values[3],
		CombinedGazeForwardX: Number(values[4]),
		CombinedGazeForwardY: Number(values[5]),
		CombinedGazeForwardZ: Number(values[6]),
		LeftEyeStatus: values[7],
		LeftEyeForwardX: Number(values[8]),
		LeftEyeForwardY: Number(values[9]),
		LeftEyeForwardZ: Number(values[10]),
		LeftPupilDiameterInMM: Number(values[11]),
		RightEyeStatus: values[12],
		RightEyeForwardX: Number(values[13]),
		RightEyeForwardY: Number(values[14]),
		RightEyeForwardZ: Number(values[15]),
		RightPupilDiameterInMM: Number(values[16])
	}
}

export const toCSV = (data: TrackingData): string => {
	return [
		data.Frame,
		data.CaptureTime,
		data.LogTime,
		data.GazeStatus,
		data.CombinedGazeForwardX,
		data.CombinedGazeForwardY,
		data.CombinedGazeForwardZ,
		data.LeftEyeStatus,
		data.LeftEyeForwardX,
		data.LeftEyeForwardY,
		data.LeftEyeForwardZ,
		data.LeftPupilDiameterInMM,
		data.RightEyeStatus,
		data.RightEyeForwardX,
		data.RightEyeForwardY,
		data.RightEyeForwardZ,
		data.RightPupilDiameterInMM
	].join(',');
}