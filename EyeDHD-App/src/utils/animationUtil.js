export function GetPitch(x, y, z) {
    return Math.atan2(-y, Math.sqrt(x * x + z * z));
}

export function GetYaw(x, y, z) {
    return Math.atan2(x, z);
}

export function GetPitchDegrees(x, y, z) {
    return Math.atan2(-z, Math.sqrt(x * x + y * y)) * (180 / Math.PI);
}

export function GetYawDegrees(x, y, z) {
    return Math.atan2(y, x) * (180 / Math.PI);
}
