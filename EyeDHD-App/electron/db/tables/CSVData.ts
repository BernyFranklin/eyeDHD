export type CSVData = {
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