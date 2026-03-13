import { type TrackingData } from "@src/data/types";

// Calculate pitch angle from forward vector
export function GetPitch(x: number, y: number, z: number) {
	return Math.atan2(-y, Math.sqrt(x * x + z * z));
}

// Calculate yaw angle from forward vector
export function GetYaw(x: number, y: number, z: number) { return Math.atan2(x, z); }

// Normalizes pupil dilation from mm to 0-1 range
export function NormalizePupilDilation(dilationInMM: number, minMM = 1, maxMM = 8) {
    if (typeof dilationInMM !== 'number' || Number.isNaN(dilationInMM) || !Number.isFinite(dilationInMM)) {
        return 0; // Return 0 for invalid input
    }

    // Clamp dilation to min and max
    const clampedDilation = Math.min(Math.max(dilationInMM, minMM), maxMM);

    // Normalize to 0-1 range
    return (clampedDilation - minMM) / (maxMM - minMM);
}

// Check data validity for angle and required fields
export function CheckDataValidity(angle: number, row: TrackingData) {
    let isValid = true;

    // Validate angle
    if((typeof angle !== 'number' && Number.isNaN(angle) && !Number.isFinite(angle))){
        isValid = false;
    }

    // Sanity check for required fields
    const positions = ['Left', 'Right'];
    const axis = ['X', 'Y', 'Z'];

    // Check all required fields
    for(const pos of positions) {
        for(const ax of axis) {
            const key = `${pos}EyeForward${ax}`;

            // Check if the field is missing or empty
            if(
            	(row as any)[key] === undefined || (row as any)[key] === null
            ) {
                isValid = false;
                break;
            }
        }
    }

    return isValid;
}