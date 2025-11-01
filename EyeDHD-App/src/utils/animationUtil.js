export function GetPitch(x, y, z) {
    return Math.atan2(-z, Math.sqrt(x * x + y * y));
}

export function GetYaw(x, y, z) {
    return Math.atan2(y, x);
}